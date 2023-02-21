export {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.5.0";
export { delay } from "https://deno.land/std@0.173.0/async/mod.ts";
export { ethers } from "npm:ethers@6.0.3";
export {
  type FluxTableMetaData,
  InfluxDB,
  Point,
  type QueryApi,
} from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
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
