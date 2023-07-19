import { SUPABASE_FUNCTIONS_URL } from '../constants.ts'
import { join } from '../deps.ts'
import { spinner } from '../spinner.ts'
import { getSupabaseClientAndLogin } from '../utils.ts'

export const action = async (
  options: { manifest: string },
  directory: string,
) => {
  const dev = Deno.env.get('DEV') !== undefined

  if (dev) return deleteDev(options, directory)

  spinner('Deleting...')

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
    const { session } = await getSupabaseClientAndLogin()

    const headers = new Headers()
    headers.append(
      'Authorization',
      `Bearer ${session.access_token}`,
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

    spinner().succeed('Deleted successfully!')
  } catch (error) {
    spinner().fail('Deletion failed: ' + error.message)
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
