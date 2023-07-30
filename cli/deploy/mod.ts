import { ArkiveManifest, parseArkiveManifest } from '../../mod.ts'
import { join } from '../deps.ts'
import { spinner } from '../spinner.ts'
import { craftEndpoint, getSupabaseClient } from '../utils.ts'
import { cleanup } from './cleanup.ts'
import { pkg } from './pkg.ts'
import { upload } from './upload.ts'

export const action = async (
  options: { private?: true; major?: true; env?: string },
  directory: string,
) => {
  const dev = options.env?.toLowerCase() === 'dev'

  if (dev) return deployDev(options, directory)

  try {
    spinner('Deploying...')
    // package directory
    const { fileName, tempPath } = await pkg(directory)

    const manifestPath = join(Deno.cwd(), directory, 'manifest.ts')
    let manifestImport
    try {
      manifestImport = await import(`file://${manifestPath}`)
    } catch (error) {
      throw new Error(`Error importing manifest.ts: ${error.message}`)
    }
    const manifest: ArkiveManifest = manifestImport.default ??
      manifestImport.manifest
    if (!manifest) {
      throw new Error(
        `Manifest file must export a default or manifest object.`,
      )
    }
    const { name: arkiveName } = manifest
    if (!arkiveName) {
      throw new Error(`Manifest must have a name property.`)
    }

    const { problems } = parseArkiveManifest.manifest(manifest)
    if (problems) {
      throw new Error(`Invalid manifest: ${problems}`)
    }

    // upload package
    await upload(fileName, tempPath, manifest, options)

    // cleanup
    await cleanup(tempPath)

    spinner().succeed(`Deployed successfully!`)

    const client = getSupabaseClient()
    const { data: userData, error: userError } = await client.auth.getUser()

    if (userError) {
      console.error(userError)
    } else {
      const { data, error } = await client.from('user_profile').select(
        'username',
      ).eq('id', userData.user.id).single()

      if (error) {
        console.error(error)
      } else {
        const endpoint = craftEndpoint({
          arkiveName: manifest.name,
          environment: options.env ?? 'staging',
          username: data.username,
        })
        console.log(`🚀 Arkive GraphQL endpoint ready at: ${endpoint}`)
      }
    }
  } catch (error) {
    spinner().fail('Deployment failed: ' + error.message)
  }

  Deno.exit()
}

const deployDev = async (
  options: { private?: true; major?: true },
  directory: string,
) => {
  const manifestPath = join(Deno.cwd(), directory, 'manifest.ts')
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
    method: 'POST',
    body: JSON.stringify({
      name: arkiveName,
      absolutePath: join(Deno.cwd(), directory),
      majorUpdate: options.major ?? false,
    }),
  })

  if (response.status !== 200) {
    console.log('error: ', await response.text())
  }

  Deno.exit()
}
