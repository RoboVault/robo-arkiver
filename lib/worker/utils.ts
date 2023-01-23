import { Point, ethers } from "../../deps.ts";

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
  if (getEnv("NODE_ENV") === "DEV") {
    console.log(logs.map((log) => JSON.stringify(log)).join(" "));
  }
};

export const error = (message: string) => {
  console.error(message);
  throw new Error(message);
};

export const getFromStore = async (
  store: Record<string, unknown>,
  key: string,
  getter: () => Promise<unknown>
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
