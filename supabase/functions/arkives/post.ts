import { SupabaseClient } from "@deps";
import { Arkive } from "@types";
import { getEnv } from "../../../lib/utils.ts";
import { HttpError } from "../_shared/http_error.ts";

export const post = async (
  supabase: SupabaseClient,
  params: Partial<
    { userId: string; name: string; pkg: Blob; isPublic: string }
  >,
) => {
  const { userId, name, pkg, isPublic } = params;
  // check params
  if (!userId || !name || !pkg) {
    throw new HttpError(400, "Bad Request");
  }

  // check if arkive already exists
  const selectRes = await supabase
    .from(getEnv("SUPABASE_ARKIVE_TABLE"))
    .select("id")
    .eq("user_id", userId)
    .eq("name", name);

  if (selectRes.error) {
    throw selectRes.error;
  }

  if (selectRes.data.length > 0) {
    throw new HttpError(409, "Already Exists");
  }

  // upload package to storage
  const uploadRes = await supabase.storage
    .from(getEnv("SUPABASE_ARKIVE_STORAGE"))
    .upload(`${userId}/${name}/1_0.tar.gz`, pkg, {
      contentType: "application/gzip",
    });

  if (uploadRes.error) {
    throw uploadRes.error;
  }

  // insert new arkive into db
  const insertRes = await supabase
    .from(getEnv("SUPABASE_ARKIVE_TABLE"))
    .insert({ user_id: userId, name, public: isPublic !== undefined })
    .select<"*", Arkive>("*");

  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data;
};
