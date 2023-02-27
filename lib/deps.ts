export {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.5.0";
export { delay } from "https://deno.land/std@0.173.0/async/mod.ts";
export { ethers } from "npm:ethers@6.0.3";
export * from "https://cdn.skypack.dev/@influxdata/influxdb-client-browser?dts";
export * from "https://cdn.skypack.dev/@influxdata/influxdb-client-apis?dts";
export { join } from "https://deno.land/std@0.177.0/path/mod.ts";

import * as log from "https://deno.land/std@0.177.0/log/mod.ts";

log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

export const logger = log.getLogger();
