import { Manifest } from 'https://deno.land/x/robo_arkiver/mod.ts'
import erc20 from './erc20.ts'
import { Approval, Transfer } from './entities.ts'
import { onApproval, onTransfer } from './handlers.ts'

const manifest = new Manifest('weth-events')

manifest
  .addEntities([Transfer, Approval])
  .chain('mainnet', { blockRange: 500n })
  .contract('ERC20', erc20)
  .addSources({ '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 4729568n })
  .addEventHandlers({ 'Transfer': onTransfer })
  .addEventHandlers({ 'Approval': onApproval })

export default manifest.build()
