import { Manifest } from 'hhttps://deno.land/x/robo_arkiver@v0.4.20/mod.ts'
import { ERC_20_ABI } from './Erc20.ts'
import { Entities } from './entities.ts'
import { onTransfer } from './handlers.ts'

const manifest = new Manifest('frax-balances')

manifest
  .addEntities(Entities)
  .addChain('mainnet', (chain) =>
    chain
      .addContract({
        abi: ERC_20_ABI,
        name: 'Erc20',
        sources: { '0x853d955aCEf822Db058eb8505911ED77F175b99e': 11465581n },
        eventHandlers: { 'Transfer': onTransfer },
      }))

export default manifest.build()
