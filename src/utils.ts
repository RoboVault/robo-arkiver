import { SafeLog, SafeRpcLog } from "./arkiver/types.ts";
import { avalanche } from "./deps.ts";

export const delay = (durationMs: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

export const getEnv = (key: string, defaultValue?: string): string => {
  const value = Deno.env.get(key);
  if (!value && !defaultValue) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value || defaultValue || "";
};

export const getRpcUrl = (chain: string) => {
  const rpcUrl = getEnv(`${chain.toUpperCase()}_RPC_URL`);
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL for chain ${chain}`);
  }
  return rpcUrl;
};

export const getChainObjFromChainName = (chain: string) => {
  switch (chain) {
    case "avalanche":
      return avalanche;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

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
