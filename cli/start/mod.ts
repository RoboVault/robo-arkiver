import {
	ArkiveConsoleLogHandler,
	Arkiver,
	buildSchemaFromEntities,
	defaultArkiveData,
} from '../../mod.ts'
import { $, createYoga, delay, join, log, serve } from '../deps.ts'
import { ArkiverMetadata } from '../../src/arkiver/arkive-metadata.ts'

export const action = async (
	options: {
		manifest?: string
		rpcUrl?: string[]
		mongoConnection?: string
		db: boolean
		gql: boolean
		logLevel: string
	},
	directory: string,
) => {
	Deno.env.set('DENO_ENV', 'PROD')

	if (!options.mongoConnection && options.db) {
		const cleanup = async () => {
			console.log(`\nCleaning up...`)
			const stopRes = await $`docker stop ${
				containerId.stdout.substring(0, 12)
			}`
				.stdout('piped')
			Deno.exit(stopRes.code)
		}

		Deno.addSignalListener('SIGINT', cleanup)
		Deno.addSignalListener('SIGHUP', cleanup)
		Deno.addSignalListener('SIGTERM', cleanup)
		Deno.addSignalListener('SIGQUIT', cleanup)
		Deno.addSignalListener('SIGTSTP', cleanup)
		Deno.addSignalListener('SIGABRT', cleanup)

		const containerId =
			await $`docker run --name arkiver_mongodb -d -p 27017:27017 --rm mongodb/mongodb-community-server:6.0-ubi8`
				.stdout('piped')
		await delay(3000) // wait for db to start
	}

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

	const rpcUrls = options.rpcUrl?.reduce((acc, rpc) => {
		const [name, url] = rpc.split('=')
		acc[name] = url
		return acc
	}, {} as Record<string, string>) ?? {}

	log.setup({
		handlers: {
			console: new ArkiveConsoleLogHandler(
				options.logLevel.toUpperCase() as log.LevelName,
				{
					arkive: {
						name: manifest.name ?? 'my-arkive',
						id: 0,
						majorVersion: 1,
						minorVersion: 0,
					},
				},
			),
		},
		loggers: {
			arkiver: {
				level: options.logLevel as log.LevelName,
				handlers: ['console'],
			},
		},
	})

	const arkiver = new Arkiver({
		manifest,
		mongoConnection: options.db
			? options.mongoConnection ??
				'mongodb://localhost:27017'
			: undefined,
		rpcUrls,
		arkiveData: {
			...defaultArkiveData,
			name: manifest.name ?? 'my-arkive',
		},
	})

	await arkiver.run()

	if (!options.gql || !options.db) {
		return
	}

	const schema = buildSchemaFromEntities(
		[...manifest.entities, { model: ArkiverMetadata, list: true }],
	)

	const yoga = createYoga({
		schema,
		fetchAPI: {
			Response,
		},
		graphiql: {
			title: 'Arkiver Playground',
		},
	})

	await serve(yoga, {
		port: 4000,
		onListen: ({ hostname, port }) => {
			console.log(
				`🚀 Arkiver playground ready at http://${hostname}:${port}/graphql`,
			)
		},
	})
}
