import {
  assertEquals,
} from 'https://deno.land/std@0.201.0/assert/assert_equals.ts'
import {
  assertExists,
} from 'https://deno.land/std@0.201.0/assert/assert_exists.ts'
import { Manifest } from './manifest-builder/manifest.ts'
import { parseArkiveManifest } from './manifest-validator.ts'

Deno.test('parseArkiveManifest', () => {
  const manifestBuilder = new Manifest('test')

  manifestBuilder.addChain('ethereum', (chain) =>
    chain
      .addContract({
        abi: [{
          name: 'testEvent',
          type: 'event',
          inputs: [{ type: 'address', name: 'testInput' }],
        }],
        name: 'TestContract',
        sources: {
          '0x0000000000000000000000000000000000000000': 0n,
        },
      })
      .addContract({
        abi: [{
          name: 'testEvent',
          type: 'event',
          inputs: [],
        }],
        name: 'TestContract2',
        factorySources: {
          TestContract: {
            testEvent: 'testInput',
          },
        },
        eventHandlers: {
          testEvent: () => {},
        },
      })
      .addBlockHandler({
        startBlockHeight: 0n,
        blockInterval: 0,
        handler: () => {},
      }))

  manifestBuilder
    .addChain('polygon', {
      blockRange: 100n,
    })
    .addContract({
      abi: [{
        name: 'testEvent',
        type: 'event',
        inputs: [{ type: 'address', name: 'testInput' }],
      }],
      name: 'TestContract',
      sources: {
        '0x0000000000000000000000000000000000000000': 0n,
      },
    })
    .addContract({
      abi: [{
        name: 'testEvent',
        type: 'event',
        inputs: [],
      }],
      name: 'TestContract2',
      factorySources: {
        TestContract: {
          testEvent: 'testInput',
        },
      },
      eventHandlers: {
        testEvent: () => {},
      },
    })
    .addBlockHandler({
      startBlockHeight: 0n,
      blockInterval: 0,
      handler: () => {},
    })

  const manifest = manifestBuilder.build()

  const { problems, data } = parseArkiveManifest.manifest(manifest)

  assertEquals(problems, undefined)
  assertExists(data)
})
