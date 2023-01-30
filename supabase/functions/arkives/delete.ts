import { SupabaseClient } from "../_shared/deps.ts";
import { getEnv } from "../_shared/utils.ts";

export const del = async (
  supabase: SupabaseClient,
  params: { id: string; userId: string },
) => {
  const { id, userId } = params;
  const delDbRes = await supabase
    .from(getEnv("ARKIVE_TABLE"))
    .delete()
    .eq("id", parseInt(id))
    .select();

  if (delDbRes.error) {
    throw delDbRes.error;
  }

  // delete from storage
  const readStorageRes = await supabase.storage
    .from(getEnv("ARKIVE_STORAGE"))
    .list(`${userId}/${id}`);

  if (readStorageRes.error) {
    throw readStorageRes.error;
  }

  const deleteStorageRes = await supabase.storage
    .from(getEnv("ARKIVE_STORAGE"))
    .remove(readStorageRes.data.map((f) => f.name));

  if (deleteStorageRes.error) {
    throw deleteStorageRes.error;
  }

  return delDbRes.data;
};
