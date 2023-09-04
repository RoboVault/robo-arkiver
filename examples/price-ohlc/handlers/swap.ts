import { bigIntDivToFloat, bigIntToFloat, EventHandlerFor } from '../deps.ts'
import { UNISWAP_V2_PAIR_ABI } from '../abis/uniswap-v2-pair.ts'
import { Price } from '../collections/price.ts'

const TOKEN_0_DECIMALS = 6 // USDC
const TOKEN_1_DECIMALS = 18 // ETH

export const onSwap: EventHandlerFor<typeof UNISWAP_V2_PAIR_ABI, 'Swap'> =
  async (ctx) => {
    const { amount0In, amount0Out, amount1In, amount1Out } = ctx.event.args

    const isToken0In = amount0In > 0n

    const price = bigIntDivToFloat({
      amountA: isToken0In ? amount0In : amount0Out,
      decimalsA: TOKEN_0_DECIMALS,
      amountB: isToken0In ? amount1Out : amount1In,
      decimalsB: TOKEN_1_DECIMALS,
      precision: 18,
    })

    const volume = bigIntToFloat(
      isToken0In ? amount0In : amount0Out,
      TOKEN_0_DECIMALS,
    )

    const timestampMs = await ctx.getTimestampMs()
    const timestampDate = new Date(timestampMs - (timestampMs % 60000))

    await Price(ctx.db).updateOne({
      timestamp: timestampDate,
      'tags.symbol': 'ETH',
    }, {
      $setOnInsert: {
        timestamp: timestampDate,
        'tags.symbol': 'ETH',
        'values.open': price,
      },
      $min: { 'values.low': price },
      $max: { 'values.high': price },
      $set: { 'values.close': price },
      $inc: { 'values.volume': volume },
    }, {
      upsert: true,
    })
  }
