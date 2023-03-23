import "npm:reflect-metadata";
import { Arkiver, buildSchemaFromEntities } from "../../mod.ts";
import { $, createYoga, delay, join, serve } from "../deps.ts";
import { ArkiverMetadata } from "../../src/arkiver/entities.ts";

export const action = async (
  options: {
    manifest?: string;
    rpcUrl?: string[];
    mongoHost?: string;
    mongoPort?: number;
    mongoUser?: string;
    mongoPassword?: string;
    mongoDatabase?: string;
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

  if (!options.mongoHost) {
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
      await $`docker run --name arkiver_mongodb -d -p 27017:27017 --rm mongodb/mongodb-community-server:6.0-ubi8`
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
    database: options.mongoDatabase ?? "arkiver",
    host: options.mongoHost ?? "localhost",
    port: options.mongoPort ?? 27017,
    username: options.mongoUser,
    password: options.mongoPassword,
  });

  await arkiver.run();

  const schema = buildSchemaFromEntities({
    ...manifest.entities,
    "arkiverMetadata": ArkiverMetadata,
  });

  const yoga = createYoga({
    schema,
    fetchAPI: {
      Response,
    },
    graphiql: {
      title: "Arkiver playground",
    },
  });

  await serve(yoga, {
    port: 4000,
    onListen: ({ hostname, port }) => {
      console.log(
        `🚀 Arkiver playground ready at http://${hostname}:${port}/graphql`,
      );
    },
  });
};
