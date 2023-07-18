import { Erc20 } from '../../lib/aave/abis/Erc20.ts'
import { EventHandlerContext } from '../types.ts'
import { Copy } from './manifest-copy.ts'
import { inferManifest } from './manifest.ts'
import { Manifest } from './mod.ts'

export const manifest = new Manifest('test')
  .addChain('ethereum', (chain) =>
    chain
      .addContract({
        name: 'ERC20',
        abi: Erc20,
        eventHandlers: {},
      }))
  .build()

// const handlerType = inferManifest(manifest, {
//   chain: 'ethereum',
//   contract: 'ERC20',
//   event: 'Swap',
// })
// const clonedManifest = Object.assign({}, manifest)

// const a = (() => {}) satisfies typeof clonedManifest.infer.ethereum.ERC20.onSwap
