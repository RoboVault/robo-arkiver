export const cleanup = async (tempPath: string) => {
  await Deno.remove(tempPath, { recursive: true });
};
