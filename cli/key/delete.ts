import { spinner } from '../spinner.ts'
import { getSupabaseClientAndLogin } from '../utils.ts'

export const action = async (key: string) => {
  spinner(`Deleting key ${key}`)

  const { supabase: client } = await getSupabaseClientAndLogin()

  const { error } = await client.functions.invoke('api-key', {
    method: 'DELETE',
    body: {
      apiKey: key,
    },
  })

  if (error) {
    spinner().fail(`Failed to delete key: ${error.message}`)
    return
  }

  spinner().succeed(`Successfully deleted key: ${key}`)
}
