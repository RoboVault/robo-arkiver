import { createEntity } from "../../../graphql/entity.ts";
import { Network } from "../types.ts";

export interface IERC20Token {
	id: string
	address: string
	network: string
	decimals: number
	symbol: string
}

export const ERC20Token = createEntity<IERC20Token>("ERC20Token", {
	id: String,
	address: String,
	network: String,
	decimals: Number,
	symbol: String,
});
