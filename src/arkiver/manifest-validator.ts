import {
  any,
  array,
  bigint,
  boolean,
  literal,
  object,
  optional,
  record,
  regex,
  safeParse,
  special,
  string,
  union,
  url,
} from 'https://deno.land/x/valibot@v0.8.0/mod.ts'

const manifestSchema = object({
  name: string('Name must be a string'),
  version: optional(string('Invalid version', [regex(/^v\d+$/)])),
  dataSources: record(object({
    options: object({
      blockRange: bigint('Block range must be a bigint'),
      rpcUrl: string('RPC URL must be a string', [
        url('RPC URL must be a valid URL'),
      ]),
    }),
    contracts: optional(array(object({
      id: string('Contract ID must be a string'),
      abi: array(any()),
      sources: array(object({
        address: union([
          string(
            'Address must either be a valid hexstring or a wildcard (\'*\')',
            [
              regex(/^0x[a-fA-F0-9]{40}$/, 'Address must be a valid hexstring'),
            ],
          ),
          literal('*', 'Address can be \'*\''),
        ]),
        startBlockHeight: bigint('Start block height must be a bigint'),
      })),
      events: array(object({
        name: string('Event name must be a string'),
        handler: special((input) => typeof input === 'function'),
      })),
      factorySources: optional(
        record(
          record(
            string('Factory sources must be a record of records of strings'),
          ),
        ),
      ),
    }))),
    blockHandlers: optional(array(object({
      handler: special((input) => typeof input === 'function'),
      startBlockHeight: union(
        [
          bigint('Start block height must be a bigint'),
          literal('live', 'Start block height can be \'live\''),
        ],
      ),
      blockInterval: bigint('Block interval must be a bigint'),
      name: string('Block handler name must be a string'),
    }))),
  })),
  entities: array(object({
    model: special((input) => typeof input === 'function'),
    list: boolean('Entity\'s list property must be a boolean'),
    name: string('Entity\'s name property must be a string'),
  })),
  schemaComposerCustomizer: optional(
    special((input) => typeof input === 'function'),
  ),
})

export const parseArkiveManifest = {
  manifest: (manifest: unknown) => {
    const result = safeParse(manifestSchema, manifest)
    if (result.success) {
      return { data: result.data }
    } else {
      return { problems: result.error.issues }
    }
  },
}
