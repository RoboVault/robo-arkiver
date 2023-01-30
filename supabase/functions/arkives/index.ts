import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient, SupabaseClient } from "../_shared/deps.ts";
import { getEnv } from "../_shared/utils.ts";
import { HttpError } from "../_shared/http_error.ts";
import { get } from "./get.ts";
import { post } from "./post.ts";
import { patch } from "./patch.ts";
import { del } from "./delete.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-type,Accept,X-Custom-Header,Authorization",
};

async function handle(req: Request, supabase: SupabaseClient) {
  const url = new URL(req.url);
  switch (req.method) {
    case "GET": {
      const username = url.searchParams.get("username");
      const name = url.searchParams.get("name");
      const data = await get(supabase, { username, name });
      return data;
    }
    case "POST": {
      const formData = await req.formData();
      const params = Object.fromEntries(formData.entries());
      const userIdRes = await supabase.auth.getUser();
      if (userIdRes.error) {
        throw userIdRes.error;
      }
      params.userId = userIdRes.data.user.id;
      const data = await post(supabase, params);
      return data;
    }
    case "PATCH": {
      const urlPattern = new URLPattern({
        pathname: "/arkives/:id",
      });

      if (!urlPattern.test(url)) throw new HttpError(400, "Bad Request");
      const id = urlPattern.exec(url)!.pathname.groups.id;

      const formData = await req.formData();
      const params = Object.fromEntries(formData.entries());

      const data = await patch(supabase, { id, ...params });
      return data;
    }
    case "DELETE": {
      const urlPattern = new URLPattern({
        pathname: "/arkives/:id",
      });
      if (!urlPattern.test(url)) throw new HttpError(400, "Bad Request");
      const matcher = urlPattern.exec(url);
      const id = matcher!.pathname.groups.id;

      const userIdRes = await supabase.auth.getUser();
      if (userIdRes.error) {
        throw userIdRes.error;
      }
      const userId = userIdRes.data.user.id;

      const data = await del(supabase, { id, userId });
      return data;
    }
    default:
      throw new Error(`Method ${req.method} not supported`);
  }
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const token = req.headers.get("Authorization") ??
      `Bearer ${supabaseAnonKey}`;
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: token },
        },
      },
    );

    const data = await handle(
      req,
      supabase,
    );

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof HttpError || error.status) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.status,
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
