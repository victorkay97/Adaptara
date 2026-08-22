# MARA — Phase 5

MARA (Market Adaptive Risk Agent) is Adaptara's non-deterministic, AI-generated advisory interpretation layer. It consumes authoritative `PortfolioSnapshot` and `PortfolioRiskAssessment` data; it does not replace portfolio valuation or deterministic risk scoring.

## Grounding and privacy

The context builder deliberately projects meaningful nonzero positions, calculated tiers and factor contributions into stable evidence facts. Wallet/vault addresses, RPC metadata, block metadata, transaction hashes, and secrets are omitted. Demo and fixture provenance remains an explicit limitation and is never described as live truth. Client-supplied context is advisory input only, not execution-grade proof.

Every material observation and proposal cites supplied evidence IDs. Strict Structured Output is post-validated for schema bounds, known meaningful assets, valid factors, known evidence, permitted directional actions, `executionAuthority: "none"`, and obvious numeric financial claims. Invalid responses fail closed.

An eligible semantic `invalid-model-output` failure may receive exactly one server-owned corrective generation using the same authoritative context, question, model, schema, and deterministic validator. Maximum application model attempts are two, there is no third attempt, and provider/transport failures are not application-remediated. The rejected output and validator prose are not reused as retry input.

Before any model call, a pure semantic validator requires coherent valued/assessed status facts, unique fact IDs, an authoritative risk score and tier, at least one meaningful asset, complete per-asset factor coverage, strict integer allocation BPS, and an allocation total of 10,000. This checks advisory context consistency only. Client-supplied MARA context is not execution-authoritative; future execution must independently reread authoritative chain state and policy.

## Provider and trust boundaries

The official OpenAI SDK calls the Responses API only on the server. `OPENAI_API_KEY` and `OPENAI_MODEL` are server-only. The configured model defaults to `gpt-5.6`, reasoning effort is low, storage is disabled, and no tools are supplied. The provider is behind `MaraModelClient`, allowing deterministic tests without network access.

The optional question is trimmed, limited to 1,000 characters, encoded as untrusted structured user data, and cannot select policy, model, schema, key, or tools. In Phase 5 there is no web/news/document ingestion, persistent memory, managed conversation, `previous_response_id`, or background agent.

MARA may explain supplied risk state, identify grounded observations and uncertainty, and offer directional advisory ideas. For `reduce_exposure` and `diversify`, the structured `assetId` must identify the supplied exposure to reduce or diversify away from; if no specific exposure is supported, MARA may use `review` or `maintain`. MARA does not choose the receiver, BPS, target allocation, or route. It may not invent facts or scores, recalculate risk, predict returns, issue transaction instructions, sign, or execute. Incomplete valuation or risk assessment is rejected before a model call. Future execution must independently re-read chain state and validate policy.

Phase 7 may consume an already-validated MARA proposal as directional input. MARA still does not choose exact BPS, target allocations, quantities, routes, or timing, and its `executionAuthority` remains `none`.

Phase 8 Sentinel may change deterministic risk grounding. This changes the MARA context fingerprint, so prior advice and any dependent Adaptation Plan are stale and hidden. Sentinel never calls MARA or regenerates Adaptation; the user must explicitly select **Analyze with MARA** and then explicitly generate a new simulation.

Phase 9 yield projections are not automatically supplied to MARA. Running or changing a hypothetical compounding simulation does not change authoritative portfolio/risk context and does not cause MARA to rerun or become stale.
