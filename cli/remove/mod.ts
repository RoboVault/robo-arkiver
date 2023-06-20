import { SUPABASE_FUNCTIONS_URL } from '../constants.ts'
import { join, wait } from '../deps.ts'
import { login } from '../login/mod.ts'
import { getSupabaseClient } from '../utils.ts'

export const action = async (
  options: { manifest: string },
  directory: string,
) => {
  const dev = Deno.env.get('DEV') !== undefined

  if (dev) return deleteDev(options, directory)

  const spinner = wait('Deleting...').start()

  try {
    const { manifest: manifestPath } = options
    const dir = `file://${
      join(Deno.cwd(), directory, manifestPath ?? 'manifest.ts')
    }`

    const manifestImport = await import(dir)

    const manifest = manifestImport.default ?? manifestImport.manifest

    if (!manifest) {
      throw new Error(
        `Manifest file must export a default or manifest object.`,
      )
    }

    const arkiveName = manifest.name

    if (!arkiveName) {
      throw new Error('Manifest must have a name')
    }

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

    const deleteRes = await fetch(
      new URL(`/arkives/${arkiveName}`, SUPABASE_FUNCTIONS_URL),
      {
        method: 'DELETE',
        headers,
      },
    )

    if (!deleteRes.ok) {
      throw new Error(await deleteRes.text())
    }

    spinner.succeed('Deleted successfully!')
  } catch (error) {
    spinner.fail('Deletion failed: ' + error.message)
    console.error(error)
  }

  Deno.exit()
}

const deleteDev = async (
  options: { manifest: string },
  directory: string,
) => {
  const manifestPath = join(
    Deno.cwd(),
    directory,
    options.manifest ?? 'manifest.ts',
  )
  let manifestImport
  try {
    manifestImport = await import(`file://${manifestPath}`)
  } catch (error) {
    throw new Error(`Error importing manifest.ts: ${error.message}`)
  }
  const manifest = manifestImport.default ?? manifestImport.manifest
  if (!manifest) {
    throw new Error(
      `Manifest file must export a default or manifest object.`,
    )
  }
  const { name: arkiveName } = manifest
  if (!arkiveName) {
    throw new Error(`Manifest must have a name property.`)
  }

  const url = 'http://localhost:42069'

  const response = await fetch(url, {
    method: 'DELETE',
    body: JSON.stringify({
      name: arkiveName,
    }),
  })

  if (response.status !== 200) {
    console.log('error: ', await response.text())
  }

  Deno.exit()
}
