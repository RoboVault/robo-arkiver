import { createYoga } from 'npm:graphql-yoga'
import { MongoClient } from 'https://raw.githubusercontent.com/Robo-Labs/mongo/main/mod.ts'
import { createCollection } from "../../src/collection/collection.ts";
import { ArkiveSchemaComposer } from "../../src/collection/graphql.ts";

// TODO @hazelnutcloud: Implement tests

// Deno.test('graphql', async () => {
const pool = createCollection('pool', {
  _id: 'string',
  symbol: ['string'],
})

const dailyPoolVolume = createCollection('dailyPoolVolume', {
  pool: pool,
  timestamp: 'int',
  stat: {
		volume: 'float',
		volumeChange: 'float',
		innerStat: {
			innerVolume: 'float',
			innerVolumeChange: 'float',
		}
	}
})

const asc = new ArkiveSchemaComposer()

asc.addCollection(pool)
asc.addCollection(dailyPoolVolume)

const { schema, createLoaders } = asc.buildSchema()

const client = new MongoClient()

await client.connect('mongodb://localhost:27017')

const db = client.database('test')

await db.dropDatabase()

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
  stat: {
		volume: 123,
		volumeChange: 123,
		innerStat: {
			innerVolume: 123,
			innerVolumeChange: 123,
		}
	}
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
