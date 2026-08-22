import { createHmac } from "node:crypto";
if (typeof window !== "undefined") throw new Error("OKX_SIGNING_SERVER_ONLY");
export function signOkxRequest(input: { timestamp: string; method: "GET" | "POST"; pathWithQuery: string; body?: string; secret: string }) { return createHmac("sha256", input.secret).update(`${input.timestamp}${input.method}${input.pathWithQuery}${input.body ?? ""}`).digest("base64"); }
