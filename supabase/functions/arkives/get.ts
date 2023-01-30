import { SupabaseClient } from "../_shared/deps.ts";
import { getEnv } from "../_shared/utils.ts";
import { HttpError } from "../_shared/http_error.ts";

export async function get(
  supabase: SupabaseClient,
  params: {
    username: string | null;
    name: string | null;
  },
) {
  const { username, name } = params;

  const query = supabase
    .from(getEnv("ARKIVE_TABLE"))
    .select("*, deployments(*)");

  if (username) {
    const profileRes = await supabase
      .from(getEnv("PROFILE_TABLE"))
      .select<"id", { id: string }>("id")
      .eq("username", username)
      .single();

    if (profileRes.error) {
      if (profileRes.error.code === "PGRST116") {
        throw new HttpError(404, "Username Not Found");
      }
      throw profileRes.error;
    }

    const userId = profileRes.data.id;

    query.eq("user_id", userId);

    if (name) {
      query.eq("name", name);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  if (data.length > 0) {
    return data;
  }

  if (username && name) throw new HttpError(404, "Arkive Not Found");

  return data;
}
