import { createClient, ethers, Point } from "@deps";

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
  const errorPoint = new Point("eth-logger-errors")
    .stringField("message", error.message)
    .stringField("stack", error.stack || "")
    .intField("error", 1)
    .timestamp(new Date());

  Object.entries(tags).forEach(([key, value]) => {
    errorPoint.tag(key, value);
  });

  console.log(errorPoint.toLineProtocol());
};

export const toNumber = (n: ethers.BigNumber, decimals: number) => {
  return Number(ethers.utils.formatUnits(n, decimals));
};

export const timeout = async (ms: number) => {
  await delay(ms);
  throw new Error(`Timed out after ${ms}ms`);
};
