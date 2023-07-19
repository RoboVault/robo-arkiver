import {
  craftEndpoint,
  getSupabaseClient,
  getSupabaseClientAndLogin,
} from '../utils.ts'
import { SUPABASE_FUNCTIONS_URL } from '../constants.ts'
import { Arkive, Deployment } from '../../src/arkiver/types.ts'
import { formatDistanceToNow } from 'npm:date-fns'
import { spinner } from '../spinner.ts'

type RawArkive = Omit<Arkive, 'deployment' | 'created_at'> & {
  deployments: Omit<Deployment, 'arkive_id'>[]
  // deno-lint-ignore ban-types
  environment: 'staging' | 'prod' | string & {}
  username: string
}

export const action = async (options: {
  all?: true
  status?: string
}) => {
  const dev = Deno.env.get('DEV') !== undefined

  if (dev) return listDev()

  spinner('Fetching your arkives...')

  try {
    // delete package
    const { supabase, session } = await getSupabaseClientAndLogin()

    const userRes = await supabase.auth.getUser()
    if (userRes.error) {
      throw userRes.error
    }

    const username = await getUsername(userRes.data.user.id)

    const headers = new Headers()
    headers.append(
      'Authorization',
      `Bearer ${session.access_token}`,
    )

    const listRes = await fetch(
      new URL(`/arkives/${username}`, SUPABASE_FUNCTIONS_URL),
      {
        method: 'GET',
        headers,
      },
    )

    if (!listRes.ok) {
      throw new Error(await listRes.text())
    }

    spinner().stop()

    const rawArkives = await listRes.json()

    console.log(rawArkives)

    if (options.all) {
      const arkives = (rawArkives as RawArkive[]).flatMap((arkive) =>
        arkive.deployments.map((deployment) => ({
          name: arkive.name,
          deployed: `${
            formatDistanceToNow(
              new Date(deployment.created_at),
            )
          } ago`,
          version: `${deployment.major_version}.${deployment.minor_version}`,
          status: deployment.status,
          arkive_id: arkive.id,
          deployment_id: deployment.id.toString(),
        })).filter((deployment) =>
          options.status ? deployment.status === options.status : true
        )
      )

      console.log('All deployments:')
      console.table(arkives)
    } else {
      const arkives = (rawArkives as RawArkive[]).map((arkive) => {
        const latestDeployment = arkive.deployments.sort((a, b) =>
          a.id - b.id
        )[0]

        return {
          name: arkive.name,
          deployed: `${
            formatDistanceToNow(
              new Date(latestDeployment.created_at),
            )
          } ago`,
          version:
            `${latestDeployment.major_version}.${latestDeployment.minor_version}`,
          status: latestDeployment.status,
          endpoint: craftEndpoint({
            arkiveName: arkive.name,
            environment: arkive.environment,
            majorVersion: latestDeployment.major_version,
            username,
          }),
        }
      }).filter((deployment) =>
        options.status ? deployment.status === options.status : true
      )

      console.log('Latest deployments:')
      console.table(arkives)
    }
  } catch (error) {
    spinner().fail('Listing arkives failed: ' + error.message)
    return
  }
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

export const getUsername = async (userId: string) => {
  const supabase = getSupabaseClient()
  const profileRes = await supabase
    .from('user_profile')
    .select<'username', { username: string }>('username')
    .eq('id', userId)
    .single()

  if (profileRes.error) {
    throw profileRes.error
  }

  return profileRes.data.username
}
