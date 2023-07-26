import { supportedChains } from '../chains.ts'
import { scope } from '../deps.ts'

export const parseArkiveManifest = scope({
  manifest: {
    name: 'string',
    'version?': /^v\d+$/,
    dataSources: Object.fromEntries(
      Object.keys(supportedChains).map((chain) => [`${chain}?`, 'dataSource']),
    ) as Record<`${keyof typeof supportedChains}?`, 'dataSource'>,
    entities: 'entity[]',
    'schemaComposerCustomizer?': 'Function',
  },
  dataSource: {
    options: 'chainOptions',
    'contracts?': 'contract[]',
    'blockHandlers?': 'blockHandler[]',
  },
  entity: {
    model: 'Function',
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
    'factorySources?': 'any',
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
