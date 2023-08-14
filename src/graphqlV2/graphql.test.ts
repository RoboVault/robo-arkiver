import { createYoga } from 'npm:graphql-yoga'
import { createCollection } from './collection.ts'
import { ArkiveSchemaComposer } from './graphql.ts'
import { MongoClient } from 'https://raw.githubusercontent.com/Robo-Labs/mongo/main/mod.ts'

// TODO @hazelnutcloud: Implement tests

// Deno.test('graphql', async () => {
const pool = createCollection('pool', {
  _id: 'string',
  symbol: ['string'],
})

const dailyPoolVolume = createCollection('dailyPoolVolume', {
  pool: pool,
  timestamp: 'int',
  volume: 'float',
})

const asc = new ArkiveSchemaComposer()

asc.addCollection(pool)
asc.addCollection(dailyPoolVolume)

const { schema, createLoaders } = asc.buildSchema()

const client = new MongoClient()

await client.connect('mongodb://localhost:27017')

const db = client.database('test')

await pool(db).insertOne({
  _id: '0x123',
  symbol: ['ETH'],
})

await pool(db).findOne({
  symbol: {},
})

await dailyPoolVolume(db).insertOne({
  pool: '0x123',
  timestamp: 123,
  volume: 123,
})

const yoga = createYoga({
  schema,
  context: () => ({
    db,
    loaders: createLoaders(db),
  }),
})

Deno.serve({
  port: 4000,
  onListen: ({
    hostname,
    port,
  }) => console.log(`Listening on http://${hostname}:${port}`),
}, yoga.fetch)

// console.log(schema)
// })
