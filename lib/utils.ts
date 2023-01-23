import { SUPABASE_URL } from "./constants.ts";
import { createClient } from "../deps.ts";

export const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, getEnv("SUPABASE_SERVICE_KEY"), {
    auth: { storage: localStorage },
  });
};

export const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
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
