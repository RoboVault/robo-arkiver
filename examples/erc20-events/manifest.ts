import { Manifest } from 'https://deno.land/x/robo_arkiver@v0.4.22/mod.ts'
import { ERC_20_ABI } from './Erc20.ts'
import { Approval, Transfer } from './entities.ts'
import { onApproval, onTransfer } from './handlers.ts'

const manifest = new Manifest('weth-events')

manifest
  .addEntities([Transfer, Approval])
  .addChain('mainnet', (chain) =>
    chain
      .addContract({
        abi: ERC_20_ABI,
        name: 'Erc20',
        sources: { '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 4729568n },
        eventHandlers: { 'Transfer': onTransfer, 'Approval': onApproval },
      }))

export default manifest.build()
