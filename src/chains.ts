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
	sepolia,
} from 'https://esm.sh/viem@0.3.44/chains'

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
	localhost,
} as const
