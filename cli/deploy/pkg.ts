import { join } from "https://deno.land/std@0.175.0/path/mod.ts";

export const pkg = async (dir: string) => {
  const tempPath = await Deno.makeTempDir();
  const fileName = crypto.randomUUID() + ".tar.gz";
  const out = join(tempPath, fileName);

  const process = Deno.run({
    cmd: ["tar", "-zcvf", out, "-C", dir, "."],
    stdout: "piped",
    stderr: "piped",
  });

  const [status, err] = await Promise.all([
    process.status(),
    process.stderrOutput(),
  ]);
  console.log(status);
  if (status.code !== 0) {
    const errMsg = `Failed to build package: ${new TextDecoder().decode(err)}`;
    throw new Error(errMsg);
  }

  process.close();

  return { fileName, tempPath };
};
