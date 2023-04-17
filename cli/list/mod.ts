import { wait } from '../deps.ts'
import { getSupabaseClient } from '../utils.ts'
import { login } from '../login/mod.ts'
import { SUPABASE_FUNCTIONS_URL } from '../constants.ts'
import { Arkive, Deployment } from '../../src/arkiver/types.ts'

export const action = async () => {
	const dev = Deno.env.get('DEV') !== undefined

	if (dev) return listDev()

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

		const arkives = (await listRes.json() as (Omit<Arkive, 'deployment'> & {
			deployments: Deployment[]
		})[]).flatMap((arkive) =>
			arkive.deployments.map((deployment) => ({
				name: arkive.name,
				created_at: deployment.created_at,
				id: arkive.id,
				version: `${deployment.major_version}.${deployment.minor_version}`,
				status: deployment.status,
				is_public: arkive.public,
			}))
		)

		console.table(arkives)

		Deno.exit()
	} catch (error) {
		spinner.fail('Deletion failed: ' + error.message)
		console.error(error)
	}

	Deno.exit()
}

const listDev = async () => {
	const url = 'http://localhost:42069'

	const response = await fetch(url, {
		method: 'GET',
	})

	if (response.status !== 200) {
		console.log('error: ', await response.text())
	}

	const arkives = (await response.json() as (Omit<Arkive, 'deployment'> & {
		deployments: Deployment[]
	})[]).flatMap((arkive) =>
		arkive.deployments.map((deployment) => ({
			name: arkive.name,
			created_at: deployment.created_at,
			id: arkive.id,
			version: `${deployment.major_version}.${deployment.minor_version}`,
			status: deployment.status,
			is_public: arkive.public,
		}))
	)

	console.table(arkives)

	Deno.exit()
}
