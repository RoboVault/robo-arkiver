import { spinner } from '../spinner.ts'
import { getSupabaseClientAndLogin } from '../utils.ts'

export const action = async () => {
  spinner('Generating new API key')
  const { supabase: client } = await getSupabaseClientAndLogin()

  const { data, error } = await client.functions.invoke('api-key', {
    method: 'POST',
  })

  if (error) {
    spinner().fail(`Failed to generate key: ${error.message}`)
    return
  }

  spinner().succeed(`Generated new key: ${data.apiKey}`)
}
