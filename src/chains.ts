import {
	arbitrum,
	avalanche,
	fantom,
	mainnet,
	optimism,
	polygon,
	polygonMumbai,
	sepolia,
} from 'npm:viem/chains'

export const supportedChains = {
	avalanche,
	arbitrum,
	mainnet,
	fantom,
	polygon,
	optimism,
	mumbai: polygonMumbai,
	sepolia,
} as const
