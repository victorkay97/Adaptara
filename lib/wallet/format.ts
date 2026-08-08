import type { Address } from "viem";
export function shortenAddress(address: Address, visible = 4): string {
  return `${address.slice(0, visible + 2)}…${address.slice(-visible)}`;
}
