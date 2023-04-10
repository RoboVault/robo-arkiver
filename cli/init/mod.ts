import { $, Input, join, prompt, Select, Toggle, wait } from '../deps.ts'

export const action = async (
	options: { overwrite?: boolean },
) => {
	let spinner = wait('Fetching templates...').start()

	const templatesRes = await fetch(
		'https://api.github.com/repos/RoboVault/robo-arkiver/contents/examples',
	)

	if (!templatesRes.ok) {
		console.log('Error fetching templates')
		return
	}

	const templates = await templatesRes.json() as {
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

	spinner.stop()

	const arkive = await prompt([
		{
			name: 'dir',
			message: 'Where should we create your arkive?',
			type: Input,
			default: './cool-new-arkive',
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
			name: 'vscode',
			message: 'Are you using VSCode?',
			type: Toggle,
			default: true,
		},
	])

	const dir = join(Deno.cwd(), arkive.dir ?? './cool-new-arkive')
	const template = arkive.template ?? templateNames[0].value

	spinner = wait('Initializing arkive...').start()

	const initRes = await $`svn export ${
		options.overwrite ? `--force ` : ''
	}https://github.com/RoboVault/robo-arkiver/trunk/examples/${template} ${dir}`
		.captureCombined(true)

	if (initRes.code !== 0) {
		spinner.fail(`Error initializing arkive: ${initRes.stderr}`)
		return
	}

	spinner.succeed('Initialized arkive')
}
