import "https://deno.land/std@0.173.0/dotenv/load.ts";
import { ArkiveManager } from "./lib/manager/mod.ts";
import { devLog } from "@utils";

if (import.meta.main) {
  devLog("starting arkiver manager");
  const manager = new ArkiveManager();
  await manager.init();
}
