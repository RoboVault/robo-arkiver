import { SUPABASE_ANON_PUBLIC_KEY, SUPABASE_URL } from './constants.ts'
import { createClient, Input, Secret, z } from './deps.ts'

export const getEmail = async () => {
  const email = await Input.prompt('✉️  Email:')
  if (!email) {
    throw new Error('Email is required')
  }
  return email
}

export const getUsername = async () => {
  const username = await Input.prompt('👤 Username:')
  if (!username) {
    throw new Error('Username is required')
  }
  return username
}

export const validateEmail = (email: string) => {
  const validateEmail = z.string().email()
  const emailValidation = validateEmail.safeParse(email)
  if (!emailValidation.success) {
    const errorMsg = `Error parsing email: ${
      emailValidation.error.issues.map(
        (issue) => issue.message,
      )
    }`
    throw new Error(errorMsg)
  }
}

export const getPassword = async () => {
  const password = await Secret.prompt('🔑 Password:')
  if (!password) {
    throw new Error('Password is required')
  }
  return password
}

export const validatePassword = (password: string) => {
  const validatePassword = z.string().min(8)
  const passwordValidation = validatePassword.safeParse(password)
  if (!passwordValidation.success) {
    const errorMsg = `Error parsing password: ${
      passwordValidation.error.issues.map(
        (issue) => issue.message,
      )
    }`
    throw new Error(errorMsg)
  }
}

export const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_PUBLIC_KEY, {
    auth: { storage: localStorage },
  })
}

export const logHeader = (version: string) => {
  const colors = ['#8be9fd', '#50fa7b', '#ffb86c', '#ff79c6', '#bd93f9']

  const colorIdx = Math.floor(Math.random() * colors.length)
  const style = `color: ${colors[colorIdx]}; font-weight: bold;`
  const footerStyle = `color: ${colors[(colorIdx + 1) % colors.length]};`

  console.log(
    `%c\n\n  ▄████████    ▄████████    ▄█   ▄█▄  ▄█   ▄█    █▄     ▄████████    ▄████████ 
  ███    ███   ███    ███   ███ ▄███▀ ███  ███    ███   ███    ███   ███    ███ 
  ███    ███   ███    ███   ███▐██▀   ███▌ ███    ███   ███    █▀    ███    ███ 
  ███    ███  ▄███▄▄▄▄██▀  ▄█████▀    ███▌ ███    ███  ▄███▄▄▄      ▄███▄▄▄▄██▀ 
▀███████████ ▀▀███▀▀▀▀▀   ▀▀█████▄    ███▌ ███    ███ ▀▀███▀▀▀     ▀▀███▀▀▀▀▀   
  ███    ███ ▀███████████   ███▐██▄   ███  ███    ███   ███    █▄  ▀███████████ 
  ███    ███   ███    ███   ███ ▀███▄ ███  ███    ███   ███    ███   ███    ███ 
  ███    █▀    ███    ███   ███   ▀█▀ █▀    ▀██████▀    ██████████   ███    ███ 
               ███    ███   ▀                                        ███    ███ \n\n`,
    style,
  )
  console.log(
    `%c          -----===== Arkiver ${version} - https://arkiver.net =====-----\n`,
    footerStyle,
  )
}
