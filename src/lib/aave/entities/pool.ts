import { createEntity } from "../deps.ts";
import { Types } from 'npm:mongoose'

export interface IPool {
	protocol: string
	network: string
	underlyingSymbol: string
	underlying: any 
}

export const Pool = createEntity<IPool>("Pool", {
	protocol: String,
	network: String,
	underlyingSymbol: String,
	underlying: { type: Types.ObjectId, ref: 'Token'},
});