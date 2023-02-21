import { join } from "https://deno.land/std@0.177.0/path/mod.ts";
import { Arkiver } from "@arkiver";

export const action = async (_: void, directory: string) => {
  Deno.env.set("DENO_ENV", "DEV");
  const dir = join(Deno.cwd(), directory, "manifest.config.ts");
  console.log(dir);

  const { manifest } = await import(dir);

  const arkiver = new Arkiver(manifest, {
    created_at: new Date().toString(),
    deployment: {
      arkive_id: 1,
      created_at: new Date().toString(),
      file_path: dir,
      id: 1,
      major_version: 1,
      minor_version: 1,
      status: "pending",
    },
    id: 1,
    name: "local_arkive",
    public: false,
    user_id: "user",
  }, join(Deno.cwd(), directory));

  await arkiver.run();
};
