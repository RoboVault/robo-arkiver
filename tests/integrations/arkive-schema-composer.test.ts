import { MongoClient } from '../../src/deps.ts'
import { createCollection } from '../../src/collection/collection.ts'
import { ArkiveSchemaComposer } from '../../src/collection/schema-composer/schema-composer.ts'
import { createYoga } from 'npm:graphql-yoga'
import { assertEquals, assertMatch } from 'https://deno.land/std@0.190.0/testing/asserts.ts'

// TODO @hazelnutcloud: Implement tests for graphql schema builder

Deno.test('Arkive schema composer', async (t) => {
  const pool = createCollection('pool', {
    _id: 'string',
    symbol: ['string'],
  })

  const dailyPoolVolume = createCollection('dailyPoolVolume', {
    pool,
    timestamp: 'date',
		block: 'bigint',
		isLatest: 'boolean',
    stat: {
      volume: 'float',
      volumeChange: 'int',
      innerStat: {
        innerVolume: 'float',
        innerVolumeChange: 'int',
      },
    },
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

  await dailyPoolVolume(db).insertOne({
    pool: '0x123',
    timestamp: new Date(123),
		block: 123n,
		isLatest: true,
    stat: {
      volume: 1.5,
      volumeChange: 2,
      innerStat: {
        innerVolume: 3.5,
        innerVolumeChange: 4,
      },
    },
  })

	const yoga = createYoga({
		schema,
		context: {
			db,
			loaders: createLoaders(db),
		}
	})

	await t.step('Query plain', async () => {
		const query = /* GraphQL */`
			query {
				pool(_id: "0x123") {
					_id
					symbol
				}
				dailyPoolVolumes {
					_id
					pool {
						_id
						symbol
					}
					timestamp
					block
					isLatest
					stat {
						volume
						volumeChange
						innerStat {
							innerVolume
							innerVolumeChange
						}
					}
				}
			}
		`

		const req = new Request('http://localhost:4000/graphql', {
			body: JSON.stringify({ query }),
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		})

		const res = await yoga(req)

		const body = await res.json()
		console.log(body)

		assertEquals(body.data.pool._id, '0x123')
		assertEquals(body.data.pool.symbol[0], 'ETH')

		assertEquals(Array.isArray(body.data.dailyPoolVolumes) && body.data.dailyPoolVolumes.length, 1)
		assertMatch(body.data.dailyPoolVolumes[0]._id, /^[0-9a-f]{24}$/)
		assertEquals(body.data.dailyPoolVolumes[0].pool._id, '0x123')
		assertEquals(body.data.dailyPoolVolumes[0].pool.symbol[0], 'ETH')
		assertEquals(new Date(body.data.dailyPoolVolumes[0].timestamp).getTime(), 123)
		assertEquals(body.data.dailyPoolVolumes[0].block, 123)
		assertEquals(body.data.dailyPoolVolumes[0].isLatest, true)
		assertEquals(body.data.dailyPoolVolumes[0].stat.volume, 1.5)
		assertEquals(body.data.dailyPoolVolumes[0].stat.volumeChange, 2)
		assertEquals(body.data.dailyPoolVolumes[0].stat.innerStat.innerVolume, 3.5)
		assertEquals(body.data.dailyPoolVolumes[0].stat.innerStat.innerVolumeChange, 4)
	})

	client.close()
})
