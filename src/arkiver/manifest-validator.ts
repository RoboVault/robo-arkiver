import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { supportedChains } from '../chains.ts'
import { scope } from '../deps.ts'
import { Manifest } from './manifest-builder/manifest.ts'

export const parseArkiveManifest = scope({
  manifest: {
    name: 'string',
    'version?': /^v\d+$/,
    dataSources: Object.fromEntries(
      Object.keys(supportedChains).map((chain) => [`${chain}?`, 'dataSource']),
    ) as Record<`${keyof typeof supportedChains}?`, 'dataSource'>,
    entities: 'entity[]',
  },
  dataSource: {
    options: 'chainOptions',
    'contracts?': 'contract[]',
    'blockHandlers?': 'blockHandler[]',
  },
  entity: {
    model: 'any',
    list: 'boolean',
    name: 'string',
  },
  chainOptions: {
    blockRange: 'bigint',
    rpcUrl: 'string',
  },
  contract: {
    id: 'string',
    abi: 'any[]',
    sources: 'source[]',
    events: 'eventSource[]',
  },
  blockHandler: {
    handler: 'Function',
    startBlockHeight: 'bigint|"live"',
    blockInterval: 'bigint',
    name: 'string',
  },
  source: {
    address: '/^0x[a-fA-F0-9]{40}$/ | "*"',
    startBlockHeight: 'bigint',
  },
  eventSource: {
    name: 'string',
    handler: 'Function',
  },
}).compile()

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
