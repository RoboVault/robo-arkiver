import { SupabaseClient } from "../_shared/deps.ts";
import { Arkive } from "../_shared/types.ts";
import { getEnv } from "../_shared/utils.ts";

// update existing arkive in db
export const patch = async (
  supabase: SupabaseClient,
  params: {
    id: string;
    visibility?: "public" | string;
    name?: string;
  },
) => {
  // check params
  const { id } = params;

  // check if arkive exists
  const selectRes = await supabase
    .from(getEnv("ARKIVE_TABLE"))
    .select<"*", Arkive>("*")
    .eq("id", parseInt(id))
    .single();

  if (selectRes.error) {
    throw selectRes.error;
  }

  // update arkive in db
  const updateRes = await supabase
    .from(getEnv("ARKIVE_TABLE"))
    .update<{ name: string; public: boolean }>({
      name: params.name ? params.name : selectRes.data.name,
      public: params.visibility
        ? params.visibility === "public"
        : selectRes.data.public,
    })
    .eq("id", parseInt(id))
    .select<"*", Arkive>("*");

  if (updateRes.error) {
    throw updateRes.error;
  }

  return updateRes.data;
};
