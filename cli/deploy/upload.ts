import { getSupabaseClientAndLogin } from '../utils.ts'
import { SUPABASE_FUNCTIONS_URL } from '../constants.ts'
import { ArkiveManifest, JSONBigIntReplacer } from '../../mod.ts'
import { spinner } from '../spinner.ts'

export const upload = async (
  pkgName: string,
  tempPath: string,
  manifest: ArkiveManifest,
  options: { private?: true; major?: true; env?: string },
) => {
  spinner().text = 'Uploading...'
  const { session } = await getSupabaseClientAndLogin()

  const formData = new FormData()
  formData.append('name', manifest.name)
  formData.append(
    'manifest',
    JSON.stringify(manifest, JSONBigIntReplacer),
  )
  const filePath = new URL(`file://${tempPath}/${pkgName}`)
  formData.append(
    'pkg',
    new File([await Deno.readFile(filePath)], pkgName),
  )
  if (options.private === undefined) {
    formData.append('isPublic', 'on')
  }
  if (options.major) {
    formData.append('update', 'major')
  } else {
    formData.append('update', 'minor')
  }
  if (options.env) {
    formData.append('env', options.env)
  }

  const headers = new Headers()
  headers.append(
    'Authorization',
    `Bearer ${session.access_token}`,
  )
  const res = await fetch(
    new URL('/arkives', SUPABASE_FUNCTIONS_URL),
    {
      method: 'POST',
      body: formData,
      headers,
    },
  )
  if (!res.ok) {
    spinner().fail(`Upload failed: ${await res.text()}`)
    Deno.exit(1)
  }
}
