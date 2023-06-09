import { createEntity } from "../../../graphql/entity.ts";
import { Types } from 'npm:mongoose'

export type LendingPoolType = {
	protocol: string
	network: string
	underlyingSymbol: string
	underlying: any 
}

export const LendingPool = createEntity<LendingPoolType>("LendingPool", {
	protocol: String,
	network: String,
	underlyingSymbol: String,
	underlying: { type: Types.ObjectId, ref: 'Erc20Token'},
});