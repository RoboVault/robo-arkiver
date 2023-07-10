import { join } from 'https://deno.land/std@0.175.0/path/mod.ts'
import { $ } from '../deps.ts'
import { spinner } from '../spinner.ts'

export const pkg = async (dir: string) => {
  spinner().text = 'Packaging...'
  try {
    const tempPath = await Deno.makeTempDir()
    const fileName = crypto.randomUUID() + '.tar.gz'
    const out = join(tempPath, fileName)

    await $`tar -zcvf ${out} -C ${dir} .`

    return { fileName, tempPath }
  } catch (error) {
    spinner().fail('Packaging failed: ' + error)
    Deno.exit(1)
  }
}
