import {
  ArkiveConsoleLogHandler,
  ArkiveManifest,
  Arkiver,
  defaultArkiveData,
} from '../../mod.ts'
import { $, createYoga, join, log, logLevel, serve } from '../deps.ts'
import { ArkiveMetadata } from '../../src/arkiver/arkive-metadata.ts'
import { createManifestHandlers } from './logger.ts'
import {
  colors,
  Database,
  MongoClient,
  mongoose,
  SchemaComposer,
} from '../../src/deps.ts'
import { collectRpcUrls, delay } from '../utils.ts'
import { GraphQLSchema } from 'npm:graphql'
import { mergeSchemas } from 'npm:@graphql-tools/schema'
import { ArkiveSchemaComposer } from '../../src/collection/schema-composer/schema-composer.ts'
import { SpawnedSource } from '../../src/arkiver/spawned-source.ts'
import { buildSchemaFromEntities } from '../../src/graphql/builder.ts'

export const action = async (
  options: {
    manifest?: string
    rpcUrl?: string[]
    mongoConnection?: string
    db: boolean
    gql: boolean
    logLevel: string
    gqlOnly?: true
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
    try {
      const cleanup = async () => {
        console.log(`\nCleaning up...`)
        const stopRes = await $`docker stop ${
          containerId.stdout.substring(0, 12)
        }`
          .stdout('piped')
        Deno.exit(stopRes.code)
      }

      const addSignalToCleanup = (signal: Deno.Signal) => {
        try {
          Deno.addSignalListener(signal, cleanup)
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
    } catch (e) {
      console.error(
        `Failed to start mongodb container: ${e.message}, ${e.stack}`,
      )
      Deno.exit(1)
    }
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

  if (!manifest.dataSources) {
    throw new Error(
      `Error while reading manifest. Did you properly export the manifest?`,
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

  // An RPC for our Arkive is going to be assigned at some point.
  // The order of assignment is as follows:
  // 1. CLI command line option -r, --rpc-url
  // 2. Env variables such as {CHAIN}_RPC_URL
  // 3. RPC url defined in manifest
  // 4. Default RPC of Viem
  const rpcUrls = options.rpcUrl?.reduce((acc, rpc) => {
    const [name, url] = rpc.split('=')
    acc[name] = url
    return acc
  }, {} as Record<string, string>) ?? collectRpcUrls() ?? {}

  const connectionString = options.mongoConnection ??
    'mongodb://admin:password@localhost:27017'

  // Collections V2
  let db: Database | undefined
  if (options.db) {
    const client = new MongoClient()
    await client.connect(connectionString)
    db = client.database('0-0')
  }

  if (!options.gqlOnly) {
    const arkiver = new Arkiver({
      manifest,
      noDb: !options.db,
      rpcUrls,
      arkiveData: {
        ...defaultArkiveData,
        name: manifest.name ?? 'my-arkive',
      },
      db,
    })

    await arkiver.run()
  }

  if (!options.gql || !options.db || !db) {
    return
  }

  const schemas: GraphQLSchema[] = []

  if (manifest.entities.length > 0) {
    await mongoose.connect(connectionString, {
      dbName: '0-0',
      // deno-lint-ignore no-explicit-any
    } as any)
    const schemaComposer = new SchemaComposer()

    buildSchemaFromEntities(
      schemaComposer,
      manifest.entities,
    )

    if (manifest.schemaComposerCustomizer) {
      manifest.schemaComposerCustomizer(schemaComposer)
    }

    const schema = schemaComposer.buildSchema()

    schemas.push(schema)
  }

  const asc = new ArkiveSchemaComposer()
  asc.addCollection(ArkiveMetadata)
  asc.addCollection(SpawnedSource)
  manifest.collections?.forEach((collection) => {
    asc.addCollection(collection.collection)
  })
  const { schema: ascSchema, createLoaders } = asc.buildSchema()
  schemas.push(ascSchema)

  const schema = mergeSchemas({
    schemas,
  })

  const yoga = createYoga({
    schema,
    graphiql: {
      title: 'Arkiver Playground',
    },
    context: () => ({
      db,
      loaders: createLoaders(db!),
    }),
    landingPage: false,
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
