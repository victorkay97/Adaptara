# Coding Agent Instructions

1. Read `PROJECT_SPEC.md` first and the relevant files in `docs/` before changes.
2. Never silently change locked architecture. Report hard incompatibilities.
3. Do not implement later phases early. Keep commits phase-scoped.
4. Never expose secrets or put private keys in browser-accessible variables.
5. Do not fake blockchain integrations. Clearly label simulation and sandbox behavior.
6. Add tests with every security-sensitive feature.
7. Prefer small modules and typed structured interfaces.
8. Never let LLM output directly become transaction authority.
9. Blockchain state is the source of truth for vault ownership, balances, policy, and execution.
10. Stop and report when the current phase acceptance criteria are met.
