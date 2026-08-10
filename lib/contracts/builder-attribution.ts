import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";

const BUILDER_CODE_PATTERN = /^[a-z0-9]{16}$/;

export function createBuilderAttributionDataSuffix(builderCode: string): Hex {
  const code = builderCode.trim();
  if (!BUILDER_CODE_PATTERN.test(code)) throw new Error("Adaptara Builder Code must be a 16-character lowercase alphanumeric value.");
  return Attribution.toDataSuffix({ codes: [code] });
}

export function optionalBuilderAttributionDataSuffix(builderCode?: string): Hex | undefined {
  return builderCode === undefined ? undefined : createBuilderAttributionDataSuffix(builderCode);
}
