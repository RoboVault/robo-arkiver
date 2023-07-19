import { spinner } from '../spinner.ts'
import { getSupabaseClientAndLogin } from '../utils.ts'

export const action = async () => {
  spinner('Fetching API keys')

  const { supabase: client } = await getSupabaseClientAndLogin()

  const { data, error } = await client.functions.invoke<{ api_key: string }[]>(
    'api-key',
    {
      method: 'GET',
    },
  )

  if (error) {
    spinner().fail(`Failed to fetch keys: ${error.message}`)
    return
  }

  if (!data) {
    spinner().fail(`Failed to fetch keys: no data returned`)
    return
  }

  spinner().succeed(`Successfully fetched keys:`)

  console.table(data.map((d) => ({ key: d.api_key })))
}
