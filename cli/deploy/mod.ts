import { join, wait } from "../deps.ts";
import { cleanup } from "./cleanup.ts";
import { pkg } from "./pkg.ts";
import { upload } from "./upload.ts";

export const action = async (
	options: { public?: true; major?: true },
	directory: string,
) => {
	const spinner = wait("Packaging...").start();

	try {
		// package directory
		const { fileName, tempPath } = await pkg(directory);

		const manifestPath = join(Deno.cwd(), directory, "manifest.ts");
		let manifestImport;
		try {
			manifestImport = await import(`file://${manifestPath}`);
		} catch (error) {
			throw new Error(`Error importing manifest.ts: ${error.message}`);
		}
		const manifest = manifestImport.default ?? manifestImport.manifest;
		if (!manifest) {
			throw new Error(
				`Manifest file must export a default or manifest object.`,
			);
		}
		const { name: arkiveName } = manifest;
		if (!arkiveName) {
			throw new Error(`Manifest must have a name property.`);
		}

		spinner.text = "Uploading package...";
		// upload package
		await upload(fileName, tempPath, arkiveName, options);

		spinner.text = "Cleaning up...";
		// cleanup
		await cleanup(tempPath);

		spinner.succeed("Deployed successfully!");
	} catch (error) {
		spinner.fail("Deployment failed: " + error.message);
		console.error(error);
	}

	Deno.exit();
};
