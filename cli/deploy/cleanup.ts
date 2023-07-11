import { spinner } from '../spinner.ts'

export const cleanup = async (tempPath: string) => {
  spinner().text = 'Cleaning up...'
  await Deno.remove(tempPath, { recursive: true })
}
