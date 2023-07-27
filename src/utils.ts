import { Chains } from './arkiver/types.ts'
import { Arkive, SafeLog, SafeRpcLog } from './arkiver/types.ts'
import { supportedChains } from './chains.ts'

export const delay = (durationMs: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

export const getChainObjFromChainName = (
  chain: Chains,
) => {
  const chainObj = supportedChains[chain as keyof typeof supportedChains]
  if (!chainObj) {
    return null
  }
  return chainObj
}

export function assertChain(
  chain: string,
): asserts chain is keyof typeof supportedChains {
  if (!supportedChains[chain as keyof typeof supportedChains]) {
    throw new Error(`Unsupported chain: ${chain}`)
  }
}

export const bigIntMax = (...args: bigint[]) =>
  args.reduce((m, e) => e > m ? e : m, 0n)

export const bigIntMin = (...args: bigint[]) =>
  args.reduce((m, e) => e < m ? e : m, 2n ** 256n)

export function formatLog(
  log: SafeRpcLog,
  { args, eventName }: { args: unknown[]; eventName: string },
) {
  return {
    ...log,
    blockHash: log.blockHash,
    blockNumber: BigInt(log.blockNumber),
    logIndex: parseInt(log.logIndex, 16),
    transactionHash: log.transactionHash,
    transactionIndex: parseInt(log.transactionIndex, 16),
    ...({ args, eventName }),
    // deno-lint-ignore no-explicit-any
  } satisfies SafeLog<any>
}

export const defaultArkiveData: Arkive = {
  id: 0,
  deployment: {
    id: 0,
    arkive_id: 0,
    major_version: 0,
    minor_version: 0,
    created_at: '',
    status: 'pending',
    file_path: '',
  },
  user_id: '',
  name: '',
  public: false,
  created_at: '',
}

export const getBlocksPerSecond = (params: {
  startTime: number
  endTime: number
  blockRange: number
  items: number
}) => {
  const { startTime, endTime, blockRange, items } = params
  const timeElapsed = endTime - startTime
  const blocksPerSecond = blockRange / (timeElapsed / 1000)
  const itemsPerSecond = items / (timeElapsed / 1000)
  return { blocksPerSecond, itemsPerSecond }
}

export const JSONBigIntReplacer = (_key: string, value: unknown) => {
  return typeof value === 'bigint' ? { _bigint: value.toString() } : value
}

export const JSONBigIntReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object' && '_bigint' in value) {
    return BigInt((value as { _bigint: string })._bigint)
  }
  return value
}

export const raise = (e: string) => {
  throw new Error(e)
}
