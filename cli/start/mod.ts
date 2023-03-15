import "npm:reflect-metadata";
import { join } from "https://deno.land/std@0.179.0/path/mod.ts";
import { Arkiver } from "../../src/arkiver/arkiver.ts";
import { buildSchemaFromEntities } from "../../src/graphql/builder.ts";
import { serve } from "https://deno.land/std@0.179.0/http/server.ts";
import { $, createYoga, delay } from "../deps.ts";

export const action = async (
  options: { manifest?: string },
  directory: string,
) => {
  Deno.env.set("DENO_ENV", "development");
  const cleanup = async () => {
    console.log(`\nCleaning up...`);
    const stopRes = await $`docker stop ${containerId.stdout.substring(0, 12)}`
      .stdout("piped");
    Deno.exit(stopRes.code);
  };

  Deno.addSignalListener("SIGINT", cleanup);
  Deno.addSignalListener("SIGHUP", cleanup);
  Deno.addSignalListener("SIGTERM", cleanup);
  Deno.addSignalListener("SIGQUIT", cleanup);
  Deno.addSignalListener("SIGTSTP", cleanup);
  Deno.addSignalListener("SIGABRT", cleanup);

  const containerId =
    await $`docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=password --name arkiver_local_db postgres`
      .stdout("piped");
  await delay(3000); // wait for db to start

  const { manifest: manifestPath } = options;
  const dir = join(Deno.cwd(), directory, manifestPath ?? "manifest.ts");

  const manifestImport = await import(dir);

  const manifest = manifestImport.default ?? manifestImport.manifest;

  if (!manifest) {
    throw new Error(
      `Manifest file must export a default or manifest object.`,
    );
  }

  const arkiver = new Arkiver(manifest, {
    database: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "password",
  });

  await arkiver.run();

  const entities = manifest.entities;

  const schema = buildSchemaFromEntities(entities);

  const yoga = createYoga({
    schema,
    landingPage: false,
    graphiql: {
      title: "Arkiver Playground",
    },
  });

  await serve(
    yoga,
    {
      port: 4000,
      onListen: ({ hostname, port }) => {
        console.log(
          `Listening on ${new URL(
            yoga.graphqlEndpoint,
            `http://${hostname}:${port}`,
          )}`,
        );
      },
    },
  );
};
