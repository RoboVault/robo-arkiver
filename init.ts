import { action } from "./cli/init/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import "https://deno.land/std@0.179.0/dotenv/load.ts";

if (import.meta.main) {
  const command = new Command()
    .name("arkiver-init")
    .version("0.1.0")
    .description("Initialize a new arkive project")
    .arguments("<dir:string>")
    .option("--overwrite", "Overwrite existing files")
    .action(action);

  await command.parse(Deno.args);
}
