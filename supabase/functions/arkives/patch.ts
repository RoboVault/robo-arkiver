import { SupabaseClient } from "@deps";
import { Arkive } from "@types";
import { getEnv } from "@utils";
import { HttpError } from "../_shared/http_error.ts";

// update existing arkive in db
export const patch = async (
  supabase: SupabaseClient,
  params: Partial<
    {
      userId: string;
      name: string;
      pkg: Blob;
      updateType: "major" | "minor";
      visibility: "public" | string;
    }
  >,
) => {
  // check params
  const { userId, name, pkg, updateType } = params;
  if (!userId || !name || !pkg || !updateType) {
    throw new HttpError(400, "Bad Request");
  }

  // check if arkive exists
  const selectRes = await supabase
    .from(getEnv("SUPABASE_ARKIVE_TABLE"))
    .select<"*", Arkive>("*")
    .eq("user_id", userId)
    .eq("name", name)
    .single();

  if (selectRes.error) {
    throw selectRes.error;
  }

  if (!selectRes.data) {
    throw new HttpError(404, "Not Found");
  }

  // get new version number
  const versionNumbers = selectRes.data.version.split(".");
  const major = parseInt(versionNumbers[0]);
  const minor = parseInt(versionNumbers[1]);
  const newVersion = updateType === "major"
    ? `${major + 1}.0`
    : `${major}.${minor + 1}`;

  // upload package to storage
  const uploadRes = await supabase.storage
    .from(getEnv("SUPABASE_ARKIVE_STORAGE"))
    .upload(`${userId}/${name}/${newVersion}.tar.gz`, pkg, {
      contentType: "application/gzip",
    });

  if (uploadRes.error) {
    throw uploadRes.error;
  }

  // update arkive in db
  const updateRes = await supabase
    .from(getEnv("SUPABASE_ARKIVE_TABLE"))
    .update<{ version: string; public: boolean }>({
      version: newVersion,
      public: params.visibility
        ? params.visibility === "public"
        : selectRes.data.public,
    })
    .eq("user_id", userId)
    .eq("name", name)
    .select<"*", Arkive>("*");

  if (updateRes.error) {
    throw updateRes.error;
  }

  return updateRes.data;
};
