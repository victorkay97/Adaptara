export interface GlossaryEntry { term: string; aliases: readonly string[]; definition: string }

export const ADAPTARA_GLOSSARY: readonly GlossaryEntry[] = [
  { term: "Balance", aliases: ["token balance"], definition: "The quantity of a supported asset read from the selected wallet or vault. An unavailable balance is never treated as zero." },
  { term: "Portfolio value", aliases: ["value", "portfolio worth"], definition: "The sum of supported holdings valued with Adaptara's explicitly labeled demo reference prices. It is non-live and is withheld when valuation is incomplete." },
  { term: "Allocation", aliases: ["portfolio percentage", "percentage"], definition: "An asset's share of the fully valued supported portfolio, calculated deterministically in basis points." },
  { term: "Reserve", aliases: ["reserve asset"], definition: "The baseline-Reserve portion of the supported portfolio. In the canonical demo, USD₮0 is the reserve asset." },
  { term: "Reserve protection", aliases: ["reserve minimum"], definition: "The Financial Constitution rule requiring at least a configured share of the portfolio to remain in baseline-Reserve assets." },
  { term: "Risk", aliases: ["risk score", "risk level"], definition: "A deterministic current measurement built from supplied demo risk signals and portfolio concentration. It is not a price or return prediction." },
  { term: "Defensive", aliases: ["defensive risk"], definition: "The current deterministic risk tier for scores from 0.00 through 34.99. It describes measured risk under Adaptara's model; it is not a guarantee of safety." },
  { term: "Balanced", aliases: ["balanced risk"], definition: "The current deterministic risk tier for scores from 35.00 through 64.99." },
  { term: "Aggressive", aliases: ["aggressive risk"], definition: "The current deterministic risk tier for scores from 65.00 through 100.00. Baseline-Aggressive is separately used by Constitution exposure rules." },
  { term: "Aggressive exposure", aliases: ["aggressive allocation"], definition: "The aggregate allocation to assets classified as baseline-Aggressive in the catalog, capped by the Financial Constitution." },
  { term: "Concentration", aliases: ["concentrated"], definition: "How much of the supported portfolio is allocated to an asset. Adaptara uses allocation as the transparent concentration input in its deterministic risk model." },
  { term: "Single-asset exposure", aliases: ["single asset exposure", "single-asset limit"], definition: "The Financial Constitution cap on the allocation of each individual supported asset." },
  { term: "Financial Constitution", aliases: ["constitution", "policy"], definition: "The owner's onchain portfolio-policy boundary: reserve minimum, single-asset maximum, aggressive-exposure maximum, and daily reallocation maximum." },
  { term: "Compliance", aliases: ["compliant"], definition: "A deterministic comparison between a fully valued portfolio and the active Financial Constitution. Unavailable data is never reported as compliant." },
  { term: "Adaptation", aliases: ["adaptation plan"], definition: "A deterministic, bounded portfolio direction constructed from valid MARA advice and checked against the active Constitution. The current product only simulates it." },
  { term: "Simulation", aliases: ["simulate"], definition: "A hypothetical deterministic result for review. It does not move assets, request a signature, or submit a transaction." },
  { term: "MARA", aliases: ["market adaptive risk agent"], definition: "Adaptara's advisory AI layer. MARA interprets supplied deterministic facts and suggests directions, but cannot choose execution routes, sign, move assets, or override the Constitution." },
  { term: "Sentinel", aliases: ["event monitoring"], definition: "A user-triggered demo/non-live event-risk screen. Eligible corroborated event stress may influence deterministic risk, but Sentinel cannot call MARA or move money." },
  { term: "Wallet", aliases: ["connected wallet"], definition: "A user-selected read-only source for supported holdings. Adaptara does not manage assets held in the connected wallet." },
  { term: "Vault", aliases: ["adaptara vault"], definition: "An isolated onchain account discovered for its owner. Its balances and policy are read from X Layer; owner-controlled actions remain explicit." },
  { term: "X Layer", aliases: ["xlayer"], definition: "The blockchain network used by the Adaptara demo deployment." },
  { term: "X Layer Testnet", aliases: ["testnet"], definition: "Chain ID 1952, where the current Adaptara demo contracts and sandbox assets are deployed. Testnet assets have no real-world redemption rights." },
  { term: "Demo mode", aliases: ["demo", "non-live"], definition: "The current product mode using testnet state and fixed reference prices/risk signals. These inputs are not live market truth." },
] as const;

export function findGlossaryEntry(question: string): GlossaryEntry | null {
  const normalized = question.toLowerCase();
  const matches = ADAPTARA_GLOSSARY.flatMap((entry) => [entry.term, ...entry.aliases].filter((term) => normalized.includes(term.toLowerCase())).map((term) => ({ entry, length: term.length })));
  return matches.sort((left, right) => right.length - left.length)[0]?.entry ?? null;
}
