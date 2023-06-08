import { createEntity } from "../../../graphql/entity.ts";
import { Types } from 'npm:mongoose'

export interface ILendingPool {
	protocol: string
	network: string
	underlyingSymbol: string
	underlying: any 
}

export const LendingPool = createEntity<ILendingPool>("LendingPool", {
	protocol: String,
	network: String,
	underlyingSymbol: String,
	underlying: { type: Types.ObjectId, ref: 'ERC20Token'},
});