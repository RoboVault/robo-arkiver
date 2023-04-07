import { wait } from '../deps.ts'
import {
	getEmail,
	getPassword,
	getSupabaseClient,
	getUsername,
	validateEmail,
	validatePassword,
} from '../utils.ts'

export const action = async (options: {
	email?: string
	password?: string
	username?: string
}) => {
	console.log('Signup to RoboArkiver 🔒')

	let { email, password, username } = options

	if (!email) {
		email = await getEmail()
	}
	validateEmail(email)

	if (!password) {
		password = await getPassword()
	}
	validatePassword(password)

	if (!username) {
		username = await getUsername()
	}

	const supabase = getSupabaseClient()

	const spinner = wait('Signing up...').start()
	const signUpRes = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				username,
			},
		},
	})
	if (signUpRes.error) {
		if (
			signUpRes.error.message.includes(
				'Username already exists!',
			)
		) {
			spinner.fail('Username already taken, please try another one')
			Deno.exit(1)
		}
		spinner.fail('Signup failed')
		throw signUpRes.error
	}

	spinner.succeed(
		'Signed up successfully! Please check your email for a confirmation link.',
	)
}
