import { Store } from '../../../../mod.ts'
import { type Block, type PublicClient } from '../../../deps.ts'
import { AavePoolDataAbi } from '../abis/AavePoolDataAbi.ts'
import { AaveIntervalData } from '../entities/aaveintervaldata.ts'
import { getPoolDataAddress, getPools } from './entityutil.ts'

const nearestInterval = (now: number, interval: number) => {
  return Math.floor(now / interval) * interval
}

const toNumber = (n: bigint, decimals = 0) => {
  return Number(n) / (10 ** decimals)
}

export const blockHandlerFactory = (secondsInterval: number) => {
  return async ({ block, client, store }: {
    block: Block
    client: PublicClient
    store: Store
  }): Promise<void> => {
    const now = Number(block.timestamp)
    const nowInterval = nearestInterval(Number(now), secondsInterval)
    const last = await AaveIntervalData.findOne({}).sort({ timestamp: -1 })
    const lastInterval = last?.timestamp ??
      (nearestInterval(now, secondsInterval) - secondsInterval)

    if (lastInterval < nowInterval) {
      const pools = await getPools(client, store, block.number!)
      const { poolData } = getPoolDataAddress(client)

      const records = await Promise.all(pools.map(async (pool) => {
        const [
          , // unbacked,
          , // accruedToTreasuryScaled,
          totalAToken,
          totalStableDebt,
          totalVariableDebt,
          liquidityRate,
          variableBorrowRate,
          stableBorrowRate,
          // lastUpdateTimestamp,
        ] = await client.readContract({
          address: poolData,
          abi: AavePoolDataAbi,
          functionName: 'getReserveData',
          args: [pool.underlying.address],
          blockNumber: block.number!,
        })

        return new AaveIntervalData({
          timestamp: nowInterval,
          pool: pool,
          underlying: pool.underlying,
          liquidityRate: toNumber(liquidityRate, 27),
          variableBorrowRate: toNumber(variableBorrowRate, 27),
          stableBorrowRate: toNumber(stableBorrowRate, 27),
          totalSupply: toNumber(totalAToken, pool.underlying.decimals),
          totalDebt: toNumber(
            totalStableDebt + totalVariableDebt,
            pool.underlying.decimals,
          ),
        })
      }))

      await AaveIntervalData.bulkSave(records)
    }
  }
}
