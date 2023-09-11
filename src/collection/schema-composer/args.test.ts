import { createCollection } from '../collection.ts'
import { buildSortEnumValues } from './args.ts'
import { assertEquals } from 'https://deno.land/std@0.201.0/assert/assert_equals.ts'

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
    'b_c': {
      value: 'b_c',
    },
    'd_e_f': {
      value: 'd_e_f',
    },
  })
})
