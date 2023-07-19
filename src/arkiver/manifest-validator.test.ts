import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { Manifest } from './manifest-builder/manifest.ts'
import { parseArkiveManifest } from './manifest-validator.ts'

Deno.test('parseArkiveManifest', () => {
  const manifestBuilder = new Manifest('test')

  manifestBuilder.addChain('ethereum', (chain) => {
    chain.addContract([]).addSources({ '*': 1n })
  })

  const manifest = manifestBuilder.build()

  const { problems, data } = parseArkiveManifest.manifest(manifest)

  assertEquals(problems, undefined)
  assertExists(data)
})
