import { SupabaseClient } from "@deps";
import { getEnv } from "../../../lib/utils.ts";

export const del = async (
  supabase: SupabaseClient,
  params: { userId: string; name: string },
) => {
  const { userId, name } = params;
  const delDbRes = await supabase
    .from(getEnv("SUPABASE_ARKIVE_TABLE"))
    .delete()
    .eq("user_id", userId)
    .eq("name", name)
    .select();
  if (delDbRes.error) {
    throw delDbRes.error;
  }

  // delete from storage
  const readStorageRes = await supabase.storage
    .from(getEnv("SUPABASE_ARKIVE_STORAGE"))
    .list(`${userId}/${name}`);

  if (readStorageRes.error) {
    throw readStorageRes.error;
  }

  const deleteStorageRes = await supabase.storage
    .from(getEnv("SUPABASE_ARKIVE_STORAGE"))
    .remove(readStorageRes.data.map((f) => f.name));

  if (deleteStorageRes.error) {
    throw deleteStorageRes.error;
  }

  return delDbRes.data;
};
