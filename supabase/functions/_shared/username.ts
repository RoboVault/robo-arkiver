import { SupabaseClient } from "./deps.ts";
import { getEnv } from "./utils.ts";

export const getUserIdFromUsername = async (
  supabase: SupabaseClient,
  username: string,
) => {
  const profileRes = await supabase
    .from(getEnv("PROFILE_TABLE"))
    .select<"id", { id: string }>("id")
    .eq("username", username)
    .single();

  if (profileRes.error) {
    throw profileRes.error;
  }

  return profileRes.data.id;
};
