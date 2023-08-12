import { createCollection } from './collection.ts'
import { ArkiveSchemaComposer } from './graphql.ts'

Deno.test('graphql', () => {
  const pool = createCollection('pool', {
    _id: 'string',
    symbol: 'string',
  })

  const dailyPoolVolume = createCollection('dailyPoolVolume', {
    pool: pool,
    timestamp: 'int',
    volume: 'float',
  })

  const asc = new ArkiveSchemaComposer()

  asc.addCollection(pool)
  asc.addCollection(dailyPoolVolume)

  const schema = asc.buildSchema()

  console.log(schema)
})
