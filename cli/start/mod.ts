import {
  ArkiveConsoleLogHandler,
  ArkiveManifest,
  Arkiver,
  buildSchemaFromEntities,
  defaultArkiveData,
} from '../../mod.ts'
import { $, createYoga, delay, join, log, logLevel, serve } from '../deps.ts'
import { ArkiverMetadata } from '../../src/arkiver/arkive-metadata.ts'
import { createManifestHandlers } from './logger.ts'
import { colors, SchemaComposer } from '../../src/deps.ts'


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

  try {
    logLevel.getLevelByName(options.logLevel.toUpperCase() as log.LevelName)
  } catch (e) {
    console.error(e)
    Deno.exit(1)
  }

  if (!options.mongoConnection && options.db) {
    const cleanup = async () => {
      console.log(`\nCleaning up...`)
      const stopRes = await $`docker stop ${
        containerId.stdout.substring(0, 12)
      }`
        .stdout('piped')
      Deno.exit(stopRes.code)
    }

    const addSignalToCleanup = (signal: string) => {
      try {
        Deno.addSignalListener('SIGINT', cleanup)
      // deno-lint-ignore no-unused-vars no-empty
      } catch (e) {}
    }

    addSignalToCleanup('SIGINT')
    addSignalToCleanup('SIGHUP')
    addSignalToCleanup('SIGTERM')
    addSignalToCleanup('SIGQUIT')
    addSignalToCleanup('SIGTSTP')
    addSignalToCleanup('SIGABRT')

    const containerId =
      await $`docker run --name arkiver_mongodb -d -p 27017:27017 --env MONGO_INITDB_ROOT_USERNAME=admin --env MONGO_INITDB_ROOT_PASSWORD=password --rm mongo`
        .stdout('piped')
    await delay(3000) // wait for db to start
  }

  const { manifest: manifestPath } = options
  const dir = `file://${
    join(Deno.cwd(), directory, manifestPath ?? 'manifest.ts')
  }`

  const manifestImport = await import(dir)

  const manifest: ArkiveManifest | undefined = manifestImport.default ??
    manifestImport.manifest

  if (!manifest) {
    throw new Error(
      `Manifest file must export a default or manifest object.`,
    )
  }

  const { handlers, loggers } = createManifestHandlers(
    manifest,
    options.logLevel.toUpperCase() as log.LevelName,
  )

  log.setup({
    handlers: {
      arkiver: new ArkiveConsoleLogHandler(
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
      ...handlers,
    },
    loggers: {
      arkiver: {
        level: options.logLevel.toUpperCase() as log.LevelName,
        handlers: ['arkiver'],
      },
      ...loggers,
    },
  })

  const rpcUrls = options.rpcUrl?.reduce((acc, rpc) => {
    const [name, url] = rpc.split('=')
    acc[name] = url
    return acc
  }, {} as Record<string, string>) ?? {}

  const arkiver = new Arkiver({
    manifest,
    mongoConnection: options.db
      ? options.mongoConnection ??
        'mongodb://admin:password@localhost:27017'
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

  const schemaComposer = new SchemaComposer()

  buildSchemaFromEntities(
    schemaComposer,
    [...manifest.entities, { model: ArkiverMetadata, list: true }],
  )

  if (manifest.schemaComposerCustomizer) {
    manifest.schemaComposerCustomizer(schemaComposer)
  }

  const schema = schemaComposer.buildSchema()

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
        colors.magenta(
          colors.bold(
            `🚀 Arkiver playground ready at ${
              colors.underline(`http://${hostname}:${port}/graphql`)
            }`,
          ),
        ),
      )
    },
  })
}
