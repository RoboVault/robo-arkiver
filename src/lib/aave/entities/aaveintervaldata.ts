import { createEntity } from "../../../graphql/entity.ts";
import { Types } from 'npm:mongoose'

interface IAAVEIntervalData {
	pool: any,
	timestamp: number,
	liquidityRate: number,
	variableBorrowRate: number,
	totalSupply: number,
	totalDebt: number,
}

export const AAVEIntervalData = createEntity<IAAVEIntervalData>("AaveIntervalData", {
	pool: { type: Types.ObjectId, ref: 'Pool'},
	timestamp: { type: Number, index: true },
	liquidityRate: Number,
	variableBorrowRate: Number,
	stableBorrowRate: Number,
	totalSupply: Number,
	totalDebt: Number,
})