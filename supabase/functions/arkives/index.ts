import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.5.0";
import { getEnv } from "@utils";
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
  const urlPattern = new URLPattern({ pathname: "/arkives/:userId/:name" });
  switch (req.method) {
    case "GET": {
      const matcher = urlPattern.exec(url);
      const userId = matcher?.pathname.groups.userId ?? null;
      const name = matcher?.pathname.groups.name ?? null;
      const data = await get(supabase, { userId, name });
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
      const matcher = urlPattern.exec(url);
      const userId = matcher?.pathname.groups.userId;
      const name = matcher?.pathname.groups.name;
      if (!userId || !name) {
        throw new HttpError(400, "Bad Request");
      }
      const formData = await req.formData();
      const params = Object.fromEntries(formData.entries());
      params.userId = userId;
      params.name = name;
      const data = await patch(supabase, params);
      return data;
    }
    case "DELETE": {
      const matcher = urlPattern.exec(url);
      const userId = matcher?.pathname.groups.userId;
      const name = matcher?.pathname.groups.name;
      if (!userId || !name) {
        throw new HttpError(400, "Bad Request");
      }
      const data = await del(supabase, { userId, name });
      return data;
    }
    default:
      throw new Error(`Method ${req.method} not supported`);
  }
}

console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
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
}, { port: 8080 });
