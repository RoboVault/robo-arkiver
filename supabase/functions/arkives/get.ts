import { SupabaseClient } from "@deps";
import { Arkive } from "@types";
import { getEnv } from "@utils";
import { HttpError } from "../_shared/http_error.ts";

export async function get(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    name: string | null;
  },
) {
  const { userId, name } = params;

  const arkives = supabase
    .from(getEnv("SUPABASE_ARKIVE_TABLE"))
    .select<"*", Arkive>("*");

  if (userId) {
    arkives.eq("user_id", userId);
  }
  if (name) {
    arkives.eq("name", name);
  }
  const { data, error } = await arkives;
  if (error) {
    throw error;
  }
  if (data.length > 0) {
    return data;
  }
  throw new HttpError(404, "Not Found");
}
