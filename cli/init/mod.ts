import { $, Input, join, prompt, Select, Toggle } from '../deps.ts'

export const action = async () => {
  let pb = $.progress('Fetching templates...')

  const templatesRes = await pb.with(() =>
    fetch(
      'https://api.github.com/repos/RoboVault/robo-arkiver/contents/examples',
    )
  )

  if (!templatesRes!.ok) {
    console.log('Error fetching templates: ', templatesRes!.statusText)
    return
  }

  const templates = await templatesRes!.json() as {
    name: string
    type: string
  }[]

  const templateNames: { value: string; name: string }[] = templates.filter((
    t,
  ) => t.type === 'dir').map((
    t,
  ) => ({
    value: t.name,
    name: t.name,
  }))

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
      name: 'template',
      message: 'Which template would you like to use?',
      type: Select,
      options: templateNames,
      default: templateNames[0].value,
    },
    {
      name: 'git',
      message: 'Initialize git repo?',
      type: Toggle,
      default: true,
    },
  ])

  const newDir = join(Deno.cwd(), arkive.dir ?? defaultPath)
  const template = arkive.template ?? templateNames[0].value

  pb = $.progress('Initializing arkive...')

  try {
    await $`git init ${newDir} && cd ${newDir} && git config core.sparseCheckout true`
      .quiet('both')

    await Deno.writeFile(
      join(newDir, '.git', 'info', 'sparse-checkout'),
      new TextEncoder().encode(`examples/${template}`),
    )

    await $`git remote add origin https://github.com/RoboVault/robo-arkiver && git pull origin main && rm -rf .git`
      .quiet('both')
      .cwd(newDir)

    // traverse the template directory and move all files to the root
    for await (
      const entry of Deno.readDir(join(newDir, `examples/${template}`))
    ) {
      const source = join(newDir, `examples/${template}`, entry.name)
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
  } catch (e) {
    $.logError(`Error initializing arkive: ${e}`)
    return
  }

  pb.finish()
  $.logStep('Initialized arkive')
}
