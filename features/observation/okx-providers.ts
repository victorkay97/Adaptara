import "server-only";
import { z } from "zod";
import type { AssetId } from "@/features/portfolio/types";
import type { MarketObservationProvider, NewsObservationProvider, ObservationBatch, PortfolioExposure, MarketSignal, NewsSignal, RwaObservation, RwaObservationProvider } from "./types";

export const OKX_MARKET_PRICE_PATH = "/api/v6/dex/market/price-info";
export const OKX_NEWS_BY_SYMBOL_PATH = "/api/v6/dex/market/social/news/by-symbol";
export const OKX_RWA_PATH = "/api/v6/dex/market/rwa/tokens";
export type OkxRequest = (path: string, init: { method: "GET" | "POST"; query?: Record<string, string>; body?: unknown; timeoutMs: number }) => Promise<unknown>;

const envelope = <T extends z.ZodTypeAny>(data: T) => z.object({ code: z.literal("0"), msg: z.string(), data }).strict();
const marketSchema = envelope(z.array(z.object({ chainIndex: z.string(), tokenContractAddress: z.string(), time: z.string().regex(/^\d+$/), price: z.string(), liquidity: z.string().optional() }).passthrough()));
const articleSchema = z.object({ id: z.string().min(1), title: z.string().min(1), summary: z.string().optional(), sourceUrl: z.string().url().optional(), source: z.string().min(1), timestamp: z.string().regex(/^\d+$/), tokenSymbols: z.array(z.string()).optional(), sentiment: z.union([z.literal("1"), z.literal("2"), z.literal("3")]).optional(), importance: z.union([z.literal("1"), z.literal("2"), z.literal("3")]).optional() }).passthrough();
const newsSchema = envelope(z.object({ cursor: z.string().nullable().optional(), articles: z.array(articleSchema) }).strict());
const rwaSchema = envelope(z.array(z.object({ chainIndex: z.string(), contractAddress: z.string(), tokenSymbol: z.string(), issuer: z.string(), stockCode: z.string().optional(), tokenName: z.string().optional(), price: z.string().optional() }).passthrough()));

const batchFailure = <T>(now: Date, code: ObservationBatch<T>["errorCode"]): ObservationBatch<T> => ({ status: "unavailable", capturedAt: now.toISOString(), observations: [], errorCode: code });
const mapAsset = (assets: PortfolioExposure[], symbol: string): AssetId | null => assets.find((a) => a.symbol.toLowerCase() === symbol.toLowerCase())?.assetId ?? null;

export class OkxMarketObservationProvider implements MarketObservationProvider {
  constructor(private readonly request: OkxRequest, private readonly chainIndex: string, private readonly contracts: Partial<Record<AssetId, string>>, private readonly timeoutMs = 3_000) {}
  async observeMarket(assets: PortfolioExposure[], now: Date): Promise<ObservationBatch<MarketSignal>> {
    const requested = assets.filter((a) => (a.held || a.allowed) && this.contracts[a.assetId]);
    if (!requested.length) return { status: "healthy", capturedAt: now.toISOString(), observations: [] };
    try {
      const raw = await this.request(OKX_MARKET_PRICE_PATH, { method: "POST", body: requested.map((a) => ({ chainIndex: this.chainIndex, tokenContractAddress: this.contracts[a.assetId]!.toLowerCase() })), timeoutMs: this.timeoutMs });
      const parsed = marketSchema.safeParse(raw); if (!parsed.success) return batchFailure(now, "malformed-response");
      const observations = parsed.data.data.flatMap((item, index) => {
        const asset = requested.find((a) => this.contracts[a.assetId]!.toLowerCase() === item.tokenContractAddress.toLowerCase()); if (!asset) return [];
        const observedAt = new Date(Number(item.time)); if (!Number.isFinite(observedAt.getTime())) return [];
        return [{ id: `okx-market-${asset.assetId}-${item.time}-${index}`, assetId: asset.assetId, symbol: asset.symbol, price: item.price, priceChange24h: null, liquidityUsd: item.liquidity ?? null, observedAt: observedAt.toISOString(), expiresAt: new Date(observedAt.getTime() + 15 * 60_000).toISOString(), direction: "neutral", severity: "low", source: { provider: "okx-onchain-os-market", reference: OKX_MARKET_PRICE_PATH }, evidence: "OKX provider-reported token market data" } satisfies MarketSignal];
      });
      return { status: observations.length === requested.length ? "healthy" : "partial", capturedAt: now.toISOString(), observations };
    } catch (error) { return batchFailure(now, error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "provider-error"); }
  }
}

export class OkxNewsObservationProvider implements NewsObservationProvider {
  constructor(private readonly request: OkxRequest, private readonly timeoutMs = 3_000) {}
  async observeNews(assets: PortfolioExposure[], now: Date): Promise<ObservationBatch<NewsSignal>> {
    const symbols = assets.filter((a) => a.held || a.allowed).map((a) => a.symbol).slice(0, 20);
    if (!symbols.length) return { status: "healthy", capturedAt: now.toISOString(), observations: [] };
    try {
      const raw = await this.request(OKX_NEWS_BY_SYMBOL_PATH, { method: "GET", query: { tokenSymbols: symbols.join(","), limit: "20", detailLevel: "1", sortBy: "1" }, timeoutMs: this.timeoutMs });
      const parsed = newsSchema.safeParse(raw); if (!parsed.success) return batchFailure(now, "malformed-response");
      const seen = new Set<string>(); const observations: NewsSignal[] = [];
      for (const item of parsed.data.data.articles) { if (seen.has(item.id)) continue; seen.add(item.id); const observedAt = new Date(Number(item.timestamp)); if (!Number.isFinite(observedAt.getTime())) continue; const related = (item.tokenSymbols ?? []).map((s) => mapAsset(assets, s)).filter((x): x is AssetId => x !== null); observations.push({ id: `okx-news-${item.id}`, relatedAssetIds: related, headline: item.title, summary: item.summary ?? null, observedAt: observedAt.toISOString(), expiresAt: new Date(observedAt.getTime() + 72 * 60 * 60_000).toISOString(), sentiment: item.sentiment === "1" ? "bullish" : item.sentiment === "2" ? "bearish" : item.sentiment === "3" ? "neutral" : null, providerImportance: item.importance === "1" ? "high" : item.importance === "2" ? "medium" : item.importance === "3" ? "low" : null, source: { provider: "okx-onchain-os-social", publisher: item.source, url: item.sourceUrl ?? null } }); }
      return { status: "healthy", capturedAt: now.toISOString(), observations };
    } catch (error) { return batchFailure(now, error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "provider-error"); }
  }
}

/** Discovery only: an OKX listing never makes an asset eligible for a vault. */
export class OkxRwaObservationProvider implements RwaObservationProvider {
  constructor(private readonly request: OkxRequest, private readonly timeoutMs = 3_000) {}
  async discoverRwa(now: Date): Promise<ObservationBatch<RwaObservation>> {
    try {
      const raw = await this.request(OKX_RWA_PATH, { method: "GET", timeoutMs: this.timeoutMs });
      const parsed = rwaSchema.safeParse(raw); if (!parsed.success) return batchFailure(now, "malformed-response");
      return { status: "healthy", capturedAt: now.toISOString(), observations: parsed.data.data.map((item, index) => ({ id: `okx-rwa-${item.chainIndex}-${item.contractAddress}-${index}`, chainIndex: item.chainIndex, contractAddress: item.contractAddress.toLowerCase(), symbol: item.tokenSymbol, issuer: item.issuer, category: item.tokenName ?? null, underlyingSymbol: item.stockCode ?? null, referencePrice: item.price ?? null, eligibility: "unknown", source: { provider: "okx-onchain-os-rwa", reference: OKX_RWA_PATH } })) };
    } catch (error) { return batchFailure(now, error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "provider-error"); }
  }
}
