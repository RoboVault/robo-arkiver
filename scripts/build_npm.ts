// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.38.1/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
		crypto: true,
		custom: [{
			package: {
				name: 'node:stream/web',
			},
			globalNames: [
				'ReadableStream',
				'WritableStream',
				'TransformStream',
				'WritableStreamDefaultWriter',
				'TransformStreamDefaultController',
				'ReadableStreamDefaultReader',
				'ReadableByteStreamController',
				'ReadableStreamBYOBReader',
				'ReadableStreamBYOBRequest',
				{
					name: 'QueuingStrategy',
					typeOnly: true
				}
			]
		}]
  },
  package: {
    // package.json properties
    name: "arkiver",
    version: Deno.args[0],
    description: "Open Source Indexing SDK & Hosted Service",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/RoboVault/robo-arkiver.git",
    },
    bugs: {
      url: "https://github.com/RoboVault/robo-arkiver/issues",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
	filterDiagnostic(diagnostic) {
		if (diagnostic.file?.fileName.endsWith("arkiver/types.ts") && diagnostic.code === 2536) return false;
		if (diagnostic.file?.fileName.includes("deno.land/std") && diagnostic.file?.fileName.endsWith("log/handlers.ts") && diagnostic.code === 2304) return false;
		if (diagnostic.file?.fileName.endsWith("streams/buffer.ts") && diagnostic.code === 2339) return false;

		return true;
	},
	// scriptModule: false,
	test: false
});