import { createEntity } from "./deps.ts";

interface IBalance {
	account: string;
	amount: number;
	token: string;
}

export const Balance = createEntity<IBalance>("Balance", {
	account: String,
	amount: {
		type: Number,
		index: true,
	},
	token: String,
});
