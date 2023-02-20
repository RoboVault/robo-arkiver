import { getSupabaseClient } from "../utils.ts";
import { login } from "../login/mod.ts";
import { SUPABASE_FUNCTIONS_URL } from "../constants.ts";

export const upload = async (
  pkgName: string,
  tempPath: string,
  arkiveName: string,
  options: { public?: true; major?: true },
) => {
  const supabase = getSupabaseClient();
  const sessionRes = await supabase.auth.getSession();

  if (!sessionRes.data.session) {
    await login({}, supabase);
  }

  if (!sessionRes.data.session) {
    throw new Error("Not logged in");
  }

  const formData = new FormData();
  formData.append("name", arkiveName);
  const filePath = new URL(`file://${tempPath}/${pkgName}`);
  formData.append(
    "pkg",
    new File([await Deno.readFile(filePath)], pkgName),
  );
  if (options.public) {
    formData.append("isPublic", "on");
  }
  if (options.major) {
    formData.append("update", "major");
  } else {
    formData.append("update", "minor");
  }

  const headers = new Headers();
  headers.append(
    "Authorization",
    `Bearer ${sessionRes.data.session.access_token}`,
  );
  const res = await fetch(
    new URL("/arkives", SUPABASE_FUNCTIONS_URL),
    {
      method: "POST",
      body: formData,
      headers,
    },
  );
  console.log("Deployed successfully: ", await res.json());
};
