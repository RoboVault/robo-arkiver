import { wait } from "../deps.ts";
import { cleanup } from "./cleanup.ts";
import { pkg } from "./pkg.ts";
import { upload } from "./upload.ts";

export const action = async (
  options: { public?: true; major?: true },
  directory: string,
  arkiveName: string,
) => {
  const spinner = wait("Packaging...").start();

  try {
    // package directory
    const { fileName, tempPath } = await pkg(directory);

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
