import { $, Input, join, prompt, Toggle } from '../deps.ts'
import { spinner } from '../spinner.ts'

export const action = async () => {
  const defaultPath = './cool-new-arkive'

  const arkive = await prompt([
    {
      name: 'dir',
      message: 'Where should we create your arkive?',
      type: Input,
      default: defaultPath,
      validate: (dir: string) => {
        if (!dir) return 'Please enter a path.'
        if (dir[0] !== '.') return 'Please enter a relative path.'
        return true
      },
    },
    {
      name: 'git',
      message: 'Initialize git repo?',
      type: Toggle,
      default: true,
    },
  ])

  const newDir = join(Deno.cwd(), arkive.dir ?? defaultPath)

  spinner('Initializing arkive...').stopAndPersist()

  try {
    await $`git init ${newDir} && cd ${newDir} && git config core.sparseCheckout true`
      .quiet('both')

    await Deno.writeFile(
      join(newDir, '.git', 'info', 'sparse-checkout'),
      new TextEncoder().encode(`examples/simple`),
    )

    await $`git remote add origin https://github.com/RoboVault/robo-arkiver && git pull origin main && rm -rf .git`
      .cwd(newDir)

    // traverse the template directory and move all files to the root
    for await (
      const entry of Deno.readDir(join(newDir, `examples/simple`))
    ) {
      const source = join(newDir, `examples/simple`, entry.name)
      const destination = join(newDir, entry.name)
      await Deno.rename(source, destination)
    }

    await Deno.remove(join(newDir, 'examples'), { recursive: true })

    const dir = arkive.dir ?? defaultPath
    await Deno.mkdir(join(Deno.cwd(), dir, '.vscode'))

    const vscode = `{
    "deno.enable": true,
    "deno.unstable": true
  }`
    await Deno.writeTextFile(
      join(Deno.cwd(), dir, '.vscode', 'settings.json'),
      vscode,
    )

    const gitignore = `/.vscode
  /.vscode/*
  /.vscode/**/*
  `
    await Deno.writeTextFile(
      join(Deno.cwd(), dir, '.gitignore'),
      gitignore,
    )

    if (arkive.git) {
      await $`git init && git add . && git commit -m "Initial commit"`
        .cwd(newDir)
        .quiet('stdout')
    }

    await $`deno cache --reload deps.ts`.cwd(newDir)
  } catch (e) {
    $.logError(`Error initializing arkive: ${e}`)
    return
  }

  spinner().succeed('Initialized arkive!')
}
