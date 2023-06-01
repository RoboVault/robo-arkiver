import { parseArkiveManifest } from '../../mod.ts'
import { join, wait } from '../deps.ts'
import { cleanup } from './cleanup.ts'
import { pkg } from './pkg.ts'
import { upload } from './upload.ts'

export const action = async (
	options: { public?: true; major?: true; env?: string },
	directory: string,
) => {
	const dev = options.env?.toLowerCase() === 'dev'

	if (dev) return deployDev(options, directory)

	const spinner = wait('Packaging...').start()

	try {
		// package directory
		const { fileName, tempPath } = await pkg(directory)

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

		const { problems } = parseArkiveManifest.manifest(manifest)
		if (problems) {
			throw new Error(`Invalid manifest: ${problems}`)
		}

		spinner.text = 'Uploading package...'
		// upload package
		await upload(fileName, tempPath, manifest, options)

		spinner.text = 'Cleaning up...'
		// cleanup
		await cleanup(tempPath)

		spinner.succeed('Deployed successfully!')
	} catch (error) {
		spinner.fail('Deployment failed: ' + error.message)
		console.error(error)
	}

	Deno.exit()
}

const deployDev = async (
	options: { public?: true; major?: true },
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
