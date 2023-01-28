import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { get } from './get.ts';
import { post } from './post.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-type,Accept,X-Custom-Header,Authorization',
}

async function handle(req: any, supabase: SupabaseClient, user: string) {
  const url = new URL(req.url)
  switch (req.method) {
    case 'GET':
      const id = url.searchParams.get("id")
      return await get(supabase, user, id)
    case 'POST':
      throw new Error('POST NOT YET SUPPORTED')
    case 'UPDATE':
      throw new Error('UPDATE NOT YET SUPPORTED')
    case 'DELETE':
      throw new Error('DELETE NOT YET SUPPORTED')
    default:
      throw new Error(`Method ${req.method} not supported`)
  }
}

console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
serve(async (req) => {

  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'))
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Now we can get the session or user object
    const {
      data: { user },
    } = await supabaseUser.auth.getUser()

    // Create a Supabase client with the Auth context of the logged in user.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const data = await handle(
      req,
      supabase,
      user.id
    )

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.log(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}, { port: 8080 })
