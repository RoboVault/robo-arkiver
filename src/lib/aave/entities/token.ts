import { createEntity } from "../deps.ts";
import { Network } from "../types.ts";

export interface IToken {
	id: string
	address: string
	network: string
	decimals: number
	symbol: string
}

export const Token = createEntity<IToken>("Token", {
	id: String,
	address: String,
	network: String,
	decimals: Number,
	symbol: String,
});
