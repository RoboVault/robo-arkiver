import { formatUnits } from './deps.ts'

export const bigIntToFloat = (amount: bigint, decimals: number | bigint) => {
  const _decimals = typeof decimals === 'bigint' ? Number(decimals) : decimals
  if (_decimals < 0) {
    const factor = 10n ** BigInt(Math.abs(_decimals))
    return parseFloat((amount * factor).toString())
  }
  return parseFloat(formatUnits(amount, _decimals))
}

export const bigIntDivToFloat = (params: {
  amountA: bigint
  decimalsA: number | bigint
  amountB: bigint
  decimalsB: number | bigint
  precision: number | bigint
}) => {
  const { amountA, decimalsA, amountB, decimalsB, precision } = params
  const _decimalsA = typeof decimalsA === 'number'
    ? BigInt(decimalsA)
    : decimalsA
  const _decimalsB = typeof decimalsB === 'number'
    ? BigInt(decimalsB)
    : decimalsB
  const _precision = typeof precision === 'number'
    ? BigInt(precision)
    : precision

  const decimalsDiff = _decimalsA - _decimalsB
  const precisionFactor = 10n ** _precision

  const ratio = bigIntToFloat(
    amountA * precisionFactor / amountB,
    _precision + decimalsDiff,
  )

  return ratio
}
