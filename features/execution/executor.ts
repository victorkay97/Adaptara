import type { HexAddress, PreparedAdaptiveExecution, TransactionExecutor } from "./types";
if (typeof window !== "undefined") throw new Error("EXECUTION_MODULE_SERVER_ONLY");
export class SimulationOnlyExecutor implements TransactionExecutor {
  constructor(private readonly executor: HexAddress, private readonly simulateFn: (execution: PreparedAdaptiveExecution) => Promise<boolean>) {}
  async address() { return this.executor; }
  async simulate(execution: PreparedAdaptiveExecution) { return { passed: await this.simulateFn(execution), reference: null }; }
  async broadcast(): Promise<never> { throw new Error("BROADCAST_DISABLED_PHASE_13D"); }
}
