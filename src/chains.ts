import {
  arbitrum,
  avalanche,
  avalancheFuji,
  fantom,
  localhost,
  mainnet,
  optimism,
  polygon,
  polygonMumbai,
  polygonZkEvm,
  sepolia,
} from 'npm:viem@1.10.4/chains'
import { Chain } from './deps.ts'

export const supportedChains = {
  arbitrum,
  avalanche,
  avalancheFuji,
  mainnet,
  ethereum: mainnet,
  fantom,
  polygon,
  optimism,
  mumbai: polygonMumbai,
  sepolia,
  polygonZkEvm,
  localhost,
} as {
  arbitrum: Chain
  avalanche: Chain
  avalancheFuji: Chain
  mainnet: Chain
  ethereum: Chain
  fantom: Chain
  polygon: Chain
  optimism: Chain
  mumbai: Chain
  sepolia: Chain
  polygonZkEvm: Chain
  localhost: Chain
}
