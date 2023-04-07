import { wait } from '../deps.ts'
import { getSupabaseClient } from '../utils.ts'

export const action = async () => {
	const client = getSupabaseClient()

	const spinner = wait('Logging out...').start()

	const { error } = await client.auth.signOut()
	if (error) {
		spinner.fail('Logout failed')
		throw error
	}

	spinner.succeed('Logged out successfully!')
}
