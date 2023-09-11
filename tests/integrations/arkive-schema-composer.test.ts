import { MongoClient } from '../../src/deps.ts'
import { createCollection } from '../../src/collection/collection.ts'
import { ArkiveSchemaComposer } from '../../src/collection/schema-composer/schema-composer.ts'
import { createYoga } from 'npm:graphql-yoga@4.0.4'
import { assertEquals } from 'https://deno.land/std@0.201.0/assert/assert_equals.ts'
import { assertMatch } from 'https://deno.land/std@0.201.0/assert/assert_match.ts'

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
      volume: 'number',
      volumeChange: 'number',
      innerStat: {
        innerVolume: 'number',
        innerVolumeChange: 'number',
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

  await pool(db).insertOne({
    _id: '0x124',
    symbol: ['BTC'],
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

  await dailyPoolVolume(db).insertOne({
    pool: '0x124',
    timestamp: new Date(124),
		block: 124n,
		isLatest: false,
    stat: {
      volume: 2.5,
      volumeChange: 3,
      innerStat: {
        innerVolume: 4.5,
        innerVolumeChange: 5,
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
		const req = buildRequest(query)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.pool._id, '0x123')
		assertEquals(body.data.pool.symbol[0], 'ETH')

		assertEquals(Array.isArray(body.data.dailyPoolVolumes) && body.data.dailyPoolVolumes.length, 2)
		assertMatch(body.data.dailyPoolVolumes[0]._id , /^[0-9a-f]{24}$/)
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

	await t.step('Query with sort', async () => {
		const query = /* GraphQL */`
			query {
				dailyPoolVolumes(sort: { field: block, order: DESC }) {
					_id
					block
				}
			}
		`
		const req = buildRequest(query)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.dailyPoolVolumes[0].block, 124)
		assertEquals(body.data.dailyPoolVolumes[1].block, 123)
	})

	await t.step('Query with limit', async () => {
		const query = /* GraphQL */`
			query {
				dailyPoolVolumes(limit: 1) {
					_id
					block
				}
			}
		`
		const req = buildRequest(query)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(body.data.dailyPoolVolumes[0].block, 123)
	})

	await t.step('Query with skip', async () => {
		const query = /* GraphQL */`
			query {
				dailyPoolVolumes(skip: 1) {
					_id
					block
				}
			}
		`
		const req = buildRequest(query)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(body.data.dailyPoolVolumes[0].block, 124)
	})

	// test every filter operator for every type
	await t.step('Query with filter - number', async () => {
		const gtQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { block: { _gt: 123 } }) {
					_id
					block
				}
			}
		`
		let req = buildRequest(gtQuery)
		let res = await yoga(req)
		let body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(body.data.dailyPoolVolumes[0].block, 124)

		const gteQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { block: { _gte: 123 } }) {
					_id
					block
				}
			}
		`
		req = buildRequest(gteQuery)
		res = await yoga(req)
		body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 2)
		assertEquals(body.data.dailyPoolVolumes[0].block, 123)

		const ltQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { block: { _lt: 124 } }) {
					_id
					block
				}
			}
		`
		req = buildRequest(ltQuery)
		res = await yoga(req)
		body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(body.data.dailyPoolVolumes[0].block, 123)

		const lteQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { block: { _lte: 124 } }) {
					_id
					block
				}
			}
		`
		req = buildRequest(lteQuery)
		res = await yoga(req)
		body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 2)
		assertEquals(body.data.dailyPoolVolumes[0].block, 123)
	})

		// Test for string type
	await t.step('Query with filter - string', async () => {
		const eqQuery = /* GraphQL */`
			query {
				pools(filter: { _id: { _eq: "0x123" } }) {
					_id
				}
			}
		`
		let req = buildRequest(eqQuery)
		let res = await yoga(req)
		let body = await res.json()
		
		assertEquals(body.data.pools.length, 1)
		assertEquals(body.data.pools[0]._id, "0x123")
		
		const inQuery = /* GraphQL */`
			query {
				pools(filter: { _id: { _in: ["0x123", "0x124"] } }) {
					_id
				}
			}
		`
		req = buildRequest(inQuery)
		res = await yoga(req)
		body = await res.json()
		
		assertEquals(body.data.pools.length, 2)
	})

	// Test for boolean type
	await t.step('Query with filter - boolean', async () => {
		const eqQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { isLatest: true }) {
					_id
					isLatest
				}
			}
		`
		const req = buildRequest(eqQuery)
		const res = await yoga(req)
		const body = await res.json()
		
		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(body.data.dailyPoolVolumes[0].isLatest, true)
	})

	// Test for date type
	await t.step('Query with filter - date', async () => {
		const gtQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { timestamp: { _gt: "1970-01-01T00:00:00.123Z" } }) {
					_id
					timestamp
				}
			}
		`
		const req = buildRequest(gtQuery)
		const res = await yoga(req)
		const body = await res.json()
		
		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(new Date(body.data.dailyPoolVolumes[0].timestamp).getTime(), 124)
	})

	// Test for AND condition
	await t.step('Query with AND condition', async () => {
		const andQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { AND: { block: { _gte: 123 }, isLatest: true } }) {
					_id
					block
					isLatest
				}
			}
		`
		const req = buildRequest(andQuery)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 1)
		assertEquals(body.data.dailyPoolVolumes[0].block, 123)
		assertEquals(body.data.dailyPoolVolumes[0].isLatest, true)
	})

	// Test for OR condition
	await t.step('Query with OR condition', async () => {
		const orQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { OR: { block: { _lt: 124 }, isLatest: false } }) {
					_id
					block
					isLatest
				}
			}
		`
		const req = buildRequest(orQuery)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 2)
	})

	// Test for nested AND and OR conditions
	await t.step('Query with nested AND and OR conditions', async () => {
		const nestedQuery = /* GraphQL */`
			query {
				dailyPoolVolumes(filter: { AND: { block: { _gte: 123 }, OR: { isLatest: true, stat: { volume: { _gte: 2.5 } } } } }) {
					_id
					block
					isLatest
					stat {
						volume
					}
				}
			}
		`
		const req = buildRequest(nestedQuery)
		const res = await yoga(req)
		const body = await res.json()

		assertEquals(body.data.dailyPoolVolumes.length, 2)
	})

	client.close()
})

const buildRequest = (query: string) => {
	return new Request('http://localhost:4000/graphql', {
		body: JSON.stringify({ query }),
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	})
}
