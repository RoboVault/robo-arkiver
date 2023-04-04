import { SafeLog, SafeRpcLog } from "./arkiver/types.ts";
import { supportedChains } from "./chains.ts";

export const delay = (durationMs: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

export const getChainObjFromChainName = (
  chain: keyof typeof supportedChains,
) => {
  const chainObj = supportedChains[chain];
  if (!chainObj) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return chainObj;
};

export function assertChain(
  chain: string,
): asserts chain is keyof typeof supportedChains {
  if (!supportedChains[chain as keyof typeof supportedChains]) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
}

export const bigIntMax = (...args: bigint[]) =>
  args.reduce((m, e) => e > m ? e : m);

export const bigIntMin = (...args: bigint[]) =>
  args.reduce((m, e) => e < m ? e : m);

export function formatLog(
  log: SafeRpcLog,
  { args, eventName }: { args?: unknown; eventName?: string } = {},
) {
  return {
    ...log,
    blockHash: log.blockHash,
    blockNumber: BigInt(log.blockNumber),
    logIndex: BigInt(log.logIndex),
    transactionHash: log.transactionHash,
    transactionIndex: BigInt(log.transactionIndex),
    ...(eventName ? { args, eventName } : {}),
    // deno-lint-ignore no-explicit-any
  } as SafeLog<any>;
}
