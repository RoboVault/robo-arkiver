import { createYoga } from 'npm:graphql-yoga'
import { createCollection } from './collection.ts'
import { buildArrayQueryArgs, buildSortEnumValues } from './filter.ts'
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts'
import { ArkiveSchemaComposer } from './graphql.ts'
import { MongoClient } from 'https://raw.githubusercontent.com/Robo-Labs/mongo/main/mod.ts'

Deno.test('buildSortEnumValues', () => {
  const collection = createCollection('test', {
    a: 'string',
    b: {
      c: 'string',
    },
    d: {
      e: {
        f: 'string',
      },
    },
  })

  const res = buildSortEnumValues(collection._schema)

  assertEquals(res, {
    a: {
      value: 'a',
    },
    'b.c': {
      value: 'b.c',
    },
    'd.e.f': {
      value: 'd.e.f',
    },
  })
})

const collection = createCollection('test', {
  _id: 'string',
  a: 'string',
  b: {
    c: 'string',
  },
  d: {
    e: {
      f: 'string',
    },
  },
})

// const res = buildArrayQueryArgs(collection)
const asc = new ArkiveSchemaComposer()
asc.addCollection(collection)
const { schema, createLoaders } = asc.buildSchema()
const mongoClient = new MongoClient()
await mongoClient.connect('mongodb://localhost:27017')
const db = mongoClient.database('test')

const yoga = createYoga({
  schema,
  context: () => ({
    db,
    loaders: createLoaders(db),
  }),
})

Deno.serve({
  onListen(params) {
    console.log(`Listening on http://${params.hostname}:${params.port}`)
  },
  port: 4000,
}, yoga.fetch)
