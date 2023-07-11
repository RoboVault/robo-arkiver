import { SupabaseClient } from '../deps.ts'
import { spinner } from '../spinner.ts'
import {
  getEmail,
  getPassword,
  getSupabaseClient,
  validateEmail,
} from '../utils.ts'

export const action = async (options: {
  email?: string
  password?: string
}) => {
  const supabase = getSupabaseClient()

  const { data } = await supabase.auth.getSession()
  if (data.session) {
    console.log('✅ Already logged in')
    Deno.exit(0)
  }

  await login(options, supabase)

  Deno.exit(0)
}

export const login = async (
  options: {
    email?: string
    password?: string
  },
  supabaseClient: SupabaseClient,
) => {
  console.log('🔒 Login to RoboArkiver')

  let { email, password } = options

  if (!email) {
    email = await getEmail()
  }
  validateEmail(email)

  if (!password) {
    password = await getPassword()
  }

  spinner('Logging in...')
  const signInRes = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInRes.error) {
    spinner().fail('Login failed')
    throw signInRes.error
  }

  spinner().succeed('Logged in successfully!')

  return signInRes
}
