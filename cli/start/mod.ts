import "npm:reflect-metadata";
import { Arkiver, buildSchemaFromEntities } from "../../mod.ts";
import { createYoga, join, serve } from "../deps.ts";
import { ArkiverMetadata } from "../../src/arkiver/arkive-metadata.ts";

export const action = async (
  options: {
    manifest?: string;
    rpcUrl: string[];
    mongoConnection?: string;
    gql: boolean;
  },
  directory: string,
) => {
  Deno.env.set("DENO_ENV", "PROD");

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

  const rpcUrls = options.rpcUrl?.reduce((acc, rpc) => {
    const [name, url] = rpc.split("=");
    acc[name] = url;
    return acc;
  }, {} as Record<string, string>);

  const arkiver = new Arkiver({
    manifest,
    mongoConnection: options.mongoConnection,
    rpcUrls,
  });

  await arkiver.run();

  if (!options.gql || !options.mongoConnection) {
    return;
  }

  const schema = buildSchemaFromEntities(
    [...manifest.entities, { model: ArkiverMetadata, list: true }],
  );

  const yoga = createYoga({
    schema,
    fetchAPI: {
      Response,
    },
    graphiql: {
      title: "Arkiver Playground",
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
