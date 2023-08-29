import { MongoClient } from '../../src/deps.ts'
import { createCollection } from '../../src/collection/collection.ts'
import { ArkiveSchemaComposer } from '../../src/collection/schema-composer/schema-composer.ts'
import { createYoga } from 'npm:graphql-yoga'
import { assertEquals } from 'https://deno.land/std@0.154.0/testing/asserts.ts'

// TODO @hazelnutcloud: Implement tests for graphql schema builder

Deno.test('Arkive schema composer', async (t) => {
  const pool = createCollection('pool', {
    _id: 'string',
    symbol: ['string'],
  })

  const dailyPoolVolume = createCollection('dailyPoolVolume', {
		_id: 'string',
    pool,
    timestamp: 'int',
    stat: {
      volume: 'float',
      volumeChange: 'float',
      innerStat: {
        innerVolume: 'float',
        innerVolumeChange: 'float',
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
		_id: '0x123-123',
    pool: '0x123',
    timestamp: 123,
    stat: {
      volume: 1,
      volumeChange: 2,
      innerStat: {
        innerVolume: 3,
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
				dailyPoolVolume(_id: "0x123-123") {
					_id
					timestamp
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

		assertEquals(body, {
			data: {
				pool: {
					_id: '0x123',
					symbol: ['ETH'],
				},
				dailyPoolVolume: {
					_id: '0x123-123',
					timestamp: 123,
					stat: {
						volume: 1,
						volumeChange: 2,
						innerStat: {
							innerVolume: 3,
							innerVolumeChange: 4,
						},
					},
				},
			},
		})
	})

	client.close()
})
