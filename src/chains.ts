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
} from 'npm:viem/chains'

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
} as const
