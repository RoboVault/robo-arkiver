import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { bigIntDivToFloat, bigIntToFloat } from './bigint.ts'

Deno.test('bigIntToFloat should convert correctly', () => {
  const result = bigIntToFloat(BigInt(100), 2)
  assertEquals(result, 1)
})

Deno.test('bigIntToFloat should handle negative decimals', () => {
  const result = bigIntToFloat(BigInt(100), -2)
  assertEquals(result, 10000)
})

Deno.test('bigIntDivToFloat should divide correctly', () => {
  const result = bigIntDivToFloat({
    amountA: BigInt(10000),
    decimalsA: 2,
    amountB: BigInt(200),
    decimalsB: 2,
    precision: 2,
  })

  assertEquals(result, 50)
})

Deno.test('bigIntDivToFloat should handle different decimals correctly', () => {
  const result = bigIntDivToFloat({
    amountA: BigInt(10000),
    decimalsA: 2,
    amountB: BigInt(200),
    decimalsB: 1,
    precision: 2,
  })

  assertEquals(result, 5)
})

Deno.test('bigIntDivToFloat should handle zero denominator', () => {
  let caughtError

  try {
    bigIntDivToFloat({
      amountA: BigInt(10000),
      decimalsA: 2,
      amountB: BigInt(0),
      decimalsB: 2,
      precision: 2,
    })
  } catch (error) {
    caughtError = error
  }

  assertEquals(caughtError instanceof Error, true)
})
