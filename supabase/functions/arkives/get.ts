import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function get(supabase: SupabaseClient, user: string, id?: number) {
  const { data, error } = id !== null ? 
    await supabase
      .from('arkive')
      .select('*')
      .eq('id', id)
      .eq('user_id', user) :
    await supabase
      .from('arkive')
      .select('*')
      .eq('user_id', user)

  if (error) throw new Error(error)
  return data
}