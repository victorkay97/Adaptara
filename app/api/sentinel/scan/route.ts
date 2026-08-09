import { NextResponse } from "next/server";
import { createSentinelAssessment } from "@/features/sentinel/assessment";
import { MAX_SENTINEL_REQUEST_BYTES } from "@/features/sentinel/constants";
import { DemoSentinelProvider } from "@/features/sentinel/providers/demo";
import { sentinelRequestSchema } from "@/features/sentinel/schemas";
import type { SentinelProvider } from "@/features/sentinel/types";

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_SENTINEL_REQUEST_BYTES) { await reader.cancel(); return null; } chunks.push(value); } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function handleSentinelScan(request: Request, provider: SentinelProvider) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SENTINEL_REQUEST_BYTES) return NextResponse.json({ error: "Sentinel request is too large" }, { status: 413 });
  let text: string | null; try { text = await readBoundedBody(request); } catch { return NextResponse.json({ error: "invalid Sentinel request" }, { status: 400 }); }
  if (text === null) return NextResponse.json({ error: "Sentinel request is too large" }, { status: 413 });
  let body: unknown; try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "invalid Sentinel request" }, { status: 400 }); }
  const parsed = sentinelRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid Sentinel request" }, { status: 400 });
  const asOf = new Date().toISOString();
  try { return NextResponse.json({ assessment: createSentinelAssessment(parsed.data.assetIds, await provider.scan(parsed.data.assetIds, asOf), asOf) }); }
  catch { return NextResponse.json({ error: "Sentinel scan is unavailable", code: "provider-failure" }, { status: 502 }); }
}

export const POST = (request: Request) => handleSentinelScan(request, new DemoSentinelProvider());
