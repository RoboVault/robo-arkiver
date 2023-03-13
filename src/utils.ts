import { avalanche, createClient, ethers, Log, RpcLog } from "./deps.ts";
import { logger } from "./logger.ts";

export const getSupabaseClient = () => {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"), {
    auth: { storage: localStorage },
  });
};
export const unpack = async (path: string, target: string) => {
  const p = Deno.run({
    cmd: ["tar", "xzf", path, "-C", target],
  });
  const status = await p.status();
  p.close();
  if (!status.success) {
    throw new Error(`Failed to unpack ${path}`);
  }
};

export const rm = async (path: string, options?: Deno.RemoveOptions) => {
  await Deno.remove(path, options);
};

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

export const devLog = (...logs: unknown[]) => {
  if (getEnv("DENO_ENV") === "DEV") {
    console.log("%cDEV", "color: blue", ...logs);
  }
};

export const error = (message: string) => {
  console.error(message);
  throw new Error(message);
};

export const getFromStore = async (
  store: Record<string, unknown>,
  key: string,
  getter: () => Promise<unknown>,
): Promise<unknown> => {
  if (store[key]) {
    return store[key];
  }
  store[key] = await getter();
  return store[key];
};

export const logError = (error: Error, tags: Record<string, string>) => {
  logger.error(`an error occured: ${error} $${tags}`);
};

export const toNumber = (n: ethers.BigNumberish, decimals: number) => {
  return Number(ethers.formatUnits(n, decimals));
};

export const timeout = async (ms: number) => {
  await delay(ms);
  throw new Error(`Timed out after ${ms}ms`);
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
  log: RpcLog,
  { args, eventName }: { args?: unknown; eventName?: string } = {},
) {
  return {
    ...log,
    blockHash: log.blockHash ? log.blockHash : null,
    blockNumber: log.blockNumber ? BigInt(log.blockNumber) : null,
    logIndex: log.logIndex ? BigInt(log.logIndex) : null,
    transactionHash: log.transactionHash ? log.transactionHash : null,
    transactionIndex: log.transactionIndex
      ? BigInt(log.transactionIndex)
      : null,
    ...(eventName ? { args, eventName } : {}),
    // deno-lint-ignore no-explicit-any
  } as Log<bigint, bigint, any, [any], any>;
}
