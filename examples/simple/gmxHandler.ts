// deno-lint-ignore-file require-await

import { type PublicClient, type Block } from "npm:viem";
// import erc20 from "./erc20.ts";
import {
  type BlockHandler,
	Store,
} from "../../mod.ts";
import { EACAggregatorProxyAbi } from "./abi/EACAggregatorProxyAbi.ts";
import { ERC20Abi } from "./abi/ERC20Abi.ts";
import { glpManagerAbi } from "./abi/glpManagerAbi.ts";
import { glpVaultAbi } from "./abi/glpVaultAbi.ts";
import { GmxRewardTrackerAbi } from "./abi/GMXRewardTracker.ts";
import { Univ2RouterAbi } from "./abi/Univ2RouterAbi.ts";
import { GLP } from "./entities.ts";

type Address = `0x${string}`
const GLP_PRICE_DECIMALS = 30
const STANDARD_DECIMALS = 18
const PRICE_FEED_DECIMALS = 8
const BTC_DECIMALS = 8
const ETH_DECIMALS = 18
const USDC_DECIMALS = 6
const FUNDING_RATE_DECIMALS = 6

const ETH: Address = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
const BTC: Address = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const GMX: Address = '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
const USDC: Address = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'

const toNumber = (n: bigint, decimals: number) => {
	return Number(n) / (10 ** decimals)
}

export const GlpHandler: BlockHandler = async ({ block, client }: {
  block: Block,
  client: PublicClient,
  store: Store,
  tempStore: Store,
}) => {
	console.log('****STARTING*****')
	const x = Date.now()
	const blockNumber = block.number
	if (!blockNumber)
		throw new Error()

	const isNewManager = blockNumber > 40559781n
	// Prep contracts
	const glpManager = {
		abi: glpManagerAbi,
		blockNumber: blockNumber,
		address: isNewManager ? '0x3963FfC9dff443c2A94f21b129D429891E32ec18' as Address : '0x321F653eED006AD1C29D174e17d96351BDe22649' as Address // Use the new one after it was deployed
	}
	const glpErc20Token = {
		abi: ERC20Abi,
		blockNumber: blockNumber,
		address: '0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258' as Address,
	}
	const glpVault = {
		abi: glpVaultAbi,
		blockNumber: blockNumber,
		address: '0x489ee077994B6658eAfA855C308275EAd8097C4A' as Address,
	}

	const btcChainlink = {
		abi: EACAggregatorProxyAbi,
		blockNumber: blockNumber,
		address: '0x6ce185860a4963106506C203335A2910413708e9' as Address,
	}

	const EthChainlink = {
		abi: EACAggregatorProxyAbi,
		blockNumber: blockNumber,
		address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612' as Address,
	}

	const RewardTracker = {
		abi: GmxRewardTrackerAbi,
		blockNumber: blockNumber,
		address: '0x4e971a87900b931fF39d1Aad67697F49835400b6' as Address,
	}

	const SushiRouter = {
		abi: Univ2RouterAbi,
		blockNumber: blockNumber,
		address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' as Address,
	}
	
	Promise.all([
		client.readContract({ functionName: "getAum", args: [true],	...glpManager }),
		client.readContract({ functionName: "totalSupply", ...glpErc20Token }),
		client.readContract({ functionName: "usdgAmounts", args: [BTC], ...glpVault }),
		client.readContract({ functionName: "usdgAmounts", args: [ETH], ...glpVault }),
		client.readContract({ functionName: "poolAmounts", args: [BTC], ...glpVault }),
		client.readContract({ functionName: "poolAmounts", args: [ETH], ...glpVault }),
		client.readContract({ functionName: "reservedAmounts", args: [BTC], ...glpVault }),
		client.readContract({ functionName: "reservedAmounts", args: [ETH], ...glpVault }),
		client.readContract({ functionName: "latestAnswer", ...btcChainlink }),
		client.readContract({ functionName: "latestAnswer", ...EthChainlink }),
		client.readContract({ functionName: "globalShortSizes", args: [BTC], ...glpVault }),
		client.readContract({ functionName: "globalShortSizes", args: [ETH], ...glpVault }),
		client.readContract({ functionName: "guaranteedUsd", args: [BTC], ...glpVault }),
		client.readContract({ functionName: "guaranteedUsd", args: [ETH], ...glpVault }),
		client.readContract({ functionName: "getUtilisation", args: [BTC], ...glpVault }),
		client.readContract({ functionName: "getUtilisation", args: [ETH], ...glpVault }),
		client.readContract({ functionName: "cumulativeRewardPerToken", ...RewardTracker }),
		client.readContract({ functionName: "getAmountsOut", ...SushiRouter, args: [BigInt(1e18),[GMX, USDC]]}),
	]).then(async data => {
		const [
			glpAumBn, 
			glpTotalSupplyBn, 
			btcAumABn,
			ethAumABn,
			btcPoolAmountBn,
			ethPoolAmountBn,
			btcReservedAmountBn,
			ethReservedAmountBn,
			btcPriceBn, 
			ethPriceBn,
			btcGlobalShortSizeBn, 
			ethGlobalShortSizeBn,
			btcGuaranteedUsdBn, 
			ethGuaranteedUsdBn,
			btcUtilisationBn, 
			ethUtilisationBn,
			cumulativeRewardPerTokenBn,
			[, gmxPriceBn],
		] = data


		const glpAum = toNumber(glpAumBn, GLP_PRICE_DECIMALS)
		const glpTotalSupply = toNumber(glpTotalSupplyBn, STANDARD_DECIMALS)
		const btcAumA = toNumber(btcAumABn, STANDARD_DECIMALS)
		const ethAumA = toNumber(ethAumABn, STANDARD_DECIMALS)
		const btcPoolAmount = toNumber(btcPoolAmountBn, BTC_DECIMALS)
		const ethPoolAmount = toNumber(ethPoolAmountBn, ETH_DECIMALS)
		const btcReservedAmount = toNumber(btcReservedAmountBn, BTC_DECIMALS)
		const ethReservedAmount = toNumber(ethReservedAmountBn, ETH_DECIMALS)
		const btcPrice = toNumber(btcPriceBn, PRICE_FEED_DECIMALS)
		const ethPrice = toNumber(ethPriceBn, PRICE_FEED_DECIMALS)
		const btcShortSize = toNumber(btcGlobalShortSizeBn, GLP_PRICE_DECIMALS)
		const ethShortSize = toNumber(ethGlobalShortSizeBn, GLP_PRICE_DECIMALS)
		const btcGuaranteedUsd = toNumber(btcGuaranteedUsdBn, GLP_PRICE_DECIMALS)
		const ethGuaranteedUsd = toNumber(ethGuaranteedUsdBn, GLP_PRICE_DECIMALS)
		const btcUtilisation = toNumber(btcUtilisationBn, FUNDING_RATE_DECIMALS)
		const ethUtilisation = toNumber(ethUtilisationBn, FUNDING_RATE_DECIMALS)
		const cumulativeRewardPerToken = toNumber(cumulativeRewardPerTokenBn, GLP_PRICE_DECIMALS)
		const gmxPrice = toNumber(gmxPriceBn, USDC_DECIMALS)
		const glpPrice = glpAum / glpTotalSupply
		const btcReserves = btcAumA / btcPrice
		const ethReserves = ethAumA / ethPrice
		const btcAumB = btcGuaranteedUsd + (btcPoolAmount - btcReservedAmount) * btcPrice // Neutra getTokenAums
		const ethAumB = ethGuaranteedUsd + (ethPoolAmount - ethReservedAmount) * ethPrice // Neutra getTokenAums

		// Old calcs
		const oldGetTokenAum = async () => {
			const [
				btcAveragePriceBn,
				ethAveragePriceBn,
			] = await Promise.all([
				client.readContract({ functionName: "globalShortAveragePrices", args: [BTC], ...glpVault }),
				client.readContract({ functionName: "globalShortAveragePrices", args: [ETH], ...glpVault }),
			])

			const btcAveragePrice = toNumber(btcAveragePriceBn, GLP_PRICE_DECIMALS)
			const ethAveragePrice = toNumber(ethAveragePriceBn, GLP_PRICE_DECIMALS)
			const btcPriceDelta = Math.abs(btcAveragePrice - btcPrice)
			const ethPriceDelta = Math.abs(ethAveragePrice - ethPrice)
			const btcDelta = btcShortSize * btcPriceDelta / btcAveragePrice
			const ethDelta = ethShortSize * ethPriceDelta / ethAveragePrice
			return { btcDelta, ethDelta }
		}

		// new calcs
		const newGetTokenAum = async () => {
			const [
				btcGlobalShortDeltaBn,
				ethGlobalShortDeltaBn,
			] = await Promise.all([
				client.readContract({ functionName: "getGlobalShortDelta", args: [BTC, btcPriceBn, btcGlobalShortSizeBn], ...glpManager }),
				client.readContract({ functionName: "getGlobalShortDelta", args: [ETH, ethPriceBn, ethGlobalShortSizeBn], ...glpManager }),
			])

			const btcDelta = btcGlobalShortDeltaBn[1] ? toNumber(btcGlobalShortDeltaBn[0], GLP_PRICE_DECIMALS) : 0
			const ethDelta = ethGlobalShortDeltaBn[1] ? toNumber(ethGlobalShortDeltaBn[0], GLP_PRICE_DECIMALS) : 0
			return { btcDelta, ethDelta }
		}

		// getTokenAums accounting for trader PnL
		const promise =  isNewManager ? newGetTokenAum() : oldGetTokenAum()
		promise.then(data => {
			const { btcDelta, ethDelta } = data
	
			const btcAumC = btcAumB + btcDelta
			const ethAumC = ethAumB + ethDelta
			
			const glp = new GLP()
			Object.assign(glp, {
				id: `${blockNumber}`,
				block: Number(block.number),
				timestamp: Number(block.timestamp),
				glpAum,
				glpTotalSupply,
				glpPrice,
				btcReserves,
				ethReserves,
				btcPrice,
				ethPrice,
				btcAumA,
				ethAumA,
				btcAumB,
				ethAumB,
				btcAumC,
				ethAumC,
				cumulativeRewardPerToken,
				gmxPrice,
				btcUtilisation,
				ethUtilisation,
			})
	
			glp.save()
			console.log(glp)
			console.log('****COMPLETE***** elapsed: ' + ((Date.now() - x) / 1000) + 's')
		}).catch(e => {
			console.log(e)
		})
	}).catch(e => {
		console.log(e)
	})
	
};