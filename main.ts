import "https://deno.land/std@0.173.0/dotenv/load.ts";
import { ArkiveManager } from "./src/manager/mod.ts";
import { logger } from "./src/logger.ts";

if (import.meta.main) {
  logger.info("Starting Arkiver...");
  const manager = new ArkiveManager();
  await manager.init();
}
