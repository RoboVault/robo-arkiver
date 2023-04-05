import { $, wait } from "../deps.ts";

export const action = async (version: string) => {
  const spinner = wait("Checking for updates...");
  // fetch latest tag from github
  const latestTagRes = await fetch(
    "https://api.github.com/repos/RoboVault/robo-arkiver/releases/latest",
  );

  if (!latestTagRes.ok) {
    spinner.fail(
      `Failed to check for updates: ${latestTagRes.status} ${latestTagRes.statusText}`,
    );
    return;
  }

  const latestTag = await latestTagRes.json();

  if (latestTag.tag_name !== version) {
    spinner.info(`Updating to latest version: ${latestTag.tag_name}`);
    const installRes =
      await $`deno install -A -f --unstable -n arkiver https://deno.land/x/robo_arkiver@${latestTag.tag_name}/cli.ts`
        .stdout("piped");

    if (installRes.code !== 0) {
      spinner.fail(`Failed to update: ${installRes.code}`);
      return;
    }

    spinner.succeed(`Updated to latest version: ${latestTag.tag_name}`);
  } else if (latestTag.tag_name === version) {
    spinner.succeed(`You are running the latest version: ${version}`);
  }
};
