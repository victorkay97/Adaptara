import { NextResponse } from "next/server";
import { analyzeWithMara } from "@/features/mara/analyze";
import { maraRequestSchema } from "@/features/mara/schemas";
import { MaraError } from "@/features/mara/types";
import { createOpenAIMaraClient } from "@/features/mara/server/openai-client";
import { validateCompleteMaraContext } from "@/features/mara/grounding";

const MAX_BODY_BYTES = 65_536;

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "MARA request is too large" }, { status: 413 });
  let text: string | null;
  try { text = await readBoundedBody(request); } catch { return NextResponse.json({ error: "invalid MARA request" }, { status: 400 }); }
  if (text === null) return NextResponse.json({ error: "MARA request is too large" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "invalid MARA request" }, { status: 400 }); }
  const parsed = maraRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid MARA request" }, { status: 400 });
  try {
    validateCompleteMaraContext(parsed.data.context);
    const analysis = await analyzeWithMara(parsed.data.context, parsed.data.question?.trim() || null, createOpenAIMaraClient());
    return NextResponse.json({ analysis });
  } catch (error) {
    const code = error instanceof MaraError ? error.code : "provider-failure";
    const status = code === "incomplete-context" ? 422 : code === "not-configured" ? 503 : 502;
    const message = code === "not-configured" ? "MARA is not configured." : code === "incomplete-context" ? "MARA requires complete deterministic data." : "MARA analysis is temporarily unavailable.";
    return NextResponse.json({ error: message, code }, { status });
  }
}
