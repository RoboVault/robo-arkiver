import { wait } from '../deps.ts'
import { getSupabaseClient } from '../utils.ts'
import { login } from '../login/mod.ts'
import { SUPABASE_FUNCTIONS_URL } from '../constants.ts'

export const action = async () => {
	const spinner = wait('Fetching your arkives...').start()

	try {
		// delete package
		const supabase = getSupabaseClient()
		const sessionRes = await supabase.auth.getSession()

		if (!sessionRes.data.session) {
			await login({}, supabase)
		}

		const userRes = await supabase.auth.getUser()
		if (userRes.error) {
			throw userRes.error
		}

		if (!sessionRes.data.session) {
			throw new Error('Not logged in')
		}

		const headers = new Headers()
		headers.append(
			'Authorization',
			`Bearer ${sessionRes.data.session.access_token}`,
		)

		const listRes = await fetch(
			new URL(`/arkives`, SUPABASE_FUNCTIONS_URL),
			{
				method: 'GET',
				headers,
			},
		)

		if (!listRes.ok) {
			throw new Error(await listRes.text())
		}

		spinner.stop()

		console.table(await listRes.json())

		Deno.exit()
	} catch (error) {
		spinner.fail('Deletion failed: ' + error.message)
		console.error(error)
	}

	Deno.exit()
}
