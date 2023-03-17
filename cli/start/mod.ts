import "npm:reflect-metadata";
import { Arkiver } from "../../src/arkiver/arkiver.ts";
import { buildSchemaFromEntities } from "../../src/graphql/builder.ts";
import { serve } from "https://deno.land/std@0.179.0/http/server.ts";
import { $, createYoga, delay, join } from "../deps.ts";

export const action = async (
  options: {
    manifest?: string;
    rpcUrl?: string[];
    pgHost?: string;
    pgPort?: number;
    pgUser?: string;
    pgPassword?: string;
    pgDatabase?: string;
  },
  directory: string,
) => {
  if (options.rpcUrl) {
    for (const rpc of options.rpcUrl) {
      const [name, url] = rpc.split("=");
      Deno.env.set(`${name.toUpperCase()}_RPC_URL`, url);
    }
  }

  Deno.env.set("DENO_ENV", "development");

  if (!options.pgHost) {
    const cleanup = async () => {
      console.log(`\nCleaning up...`);
      const stopRes = await $`docker stop ${
        containerId.stdout.substring(0, 12)
      }`
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
  }

  const { manifest: manifestPath } = options;
  const dir = `file://${
    join(Deno.cwd(), directory, manifestPath ?? "manifest.ts")
  }`;

  const manifestImport = await import(dir);

  const manifest = manifestImport.default ?? manifestImport.manifest;

  if (!manifest) {
    throw new Error(
      `Manifest file must export a default or manifest object.`,
    );
  }

  const arkiver = new Arkiver(manifest, {
    database: options.pgDatabase ?? "postgres",
    host: options.pgHost ?? "localhost",
    port: options.pgPort ?? 5432,
    username: options.pgUser ?? "postgres",
    password: options.pgPassword ?? "password",
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
