import "https://deno.land/std@0.173.0/dotenv/load.ts";
import { ArkiveManager } from "./lib/manager/mod.ts";

if (import.meta.main) {
  const manager = new ArkiveManager();
  await manager.init();
}
