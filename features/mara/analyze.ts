import type { MaraAnalysis, MaraContext, MaraModelClient } from "./types";
import { validateMaraOutput } from "./validation";
import { validateCompleteMaraContext } from "./grounding";

export async function analyzeWithMara(context: MaraContext, question: string | null, client: MaraModelClient): Promise<MaraAnalysis> {
  validateCompleteMaraContext(context);
  const output = await client.analyze({ context, question });
  return validateMaraOutput(output, context);
}
