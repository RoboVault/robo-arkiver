import { join } from "../deps.ts";
import { version } from "../../cli.ts";

export const action = async (options: { overwrite?: boolean }, dir: string) => {
	const newDir = join(Deno.cwd(), dir);

	await mkDir(newDir);

	const vscode = `{
	"deno.enable": true,
	"deno.unstable": true
}`;

	await mkDir(join(newDir, ".vscode"));
	writeFile(
		join(newDir, ".vscode"),
		"settings.json",
		vscode,
		options.overwrite,
	);

	const manifest = `import { Manifest } from "./deps.ts";
import erc20 from "./erc20.ts";
import { Balance } from "./entities.ts";
import { transferHandler } from "./transferHandler.ts";
	
const manifest = new Manifest("simple");
	
manifest
	.addEntity(Balance)
	.chain("mainnet", { blockRange: 100n })
	.contract(erc20)
	.addSources({ "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": 16986910n })
	.addEventHandlers({ "Transfer": transferHandler });

export default manifest.build();`;

	writeFile(newDir, "manifest.ts", manifest, options.overwrite);

	const entities = `import { createEntity } from "./deps.ts";

interface IBalance {
	account: string;
	amount: number;
	token: string;
	timestamp: number;
}

export const Balance = createEntity<IBalance>("Balance", {
	account: String,
	amount: {
		type: Number,
		index: true,
	},
	token: String,
	timestamp: {
		type: Number,
		index: true,
	},
});`;

	await mkDir(join(newDir, "entities"));
	writeFile(
		join(newDir, "entities"),
		"balance.ts",
		entities,
		options.overwrite,
	);

	const handler = `import { EventHandlerFor, formatUnits } from "./deps.ts";
import erc20 from "./erc20.ts";
import { Balance } from "./entities.ts";

export const transferHandler: EventHandlerFor<typeof erc20, "Transfer"> =
	async (
		{ event, client, store },
	) => {
		const { from, to, value } = event.args;

		const address = event.address;

		// store.retrieve() will return the value if it exists in the store, otherwise it will run the function and store the result
		const decimals = await store.retrieve(
			\`\${address}:decimals\`,
			async () =>
				await client.readContract({
					abi: erc20,
					functionName: "decimals",
					address,
				}),
		);

		// reduce rpc calls in case you have multiple events in the same block
		const timestamp = await store.retrieve(
			\`\${event.blockHash}:timestamp\`,
			async () => {
				const block = await client.getBlock({ blockHash: event.blockHash });
				return Number(block.timestamp);
			},
		);

		const parsedValue = parseFloat(formatUnits(value, decimals));

		const [senderBalance, receiverBalance] = await Promise.all([
			await store.retrieve(
				\`\${from}:\${address}:balance\`,
				async () => {
					const balance = await Balance
						.find({ account: from, token: address })
						.sort({ timestamp: -1 })
						.limit(1);
					return balance[0]?.amount ?? 0;
				},
			),
			await store.retrieve(
				\`\${to}:\${address}:balance\`,
				async () => {
					const balance = await Balance
						.find({ account: from, token: address })
						.sort({ timestamp: -1 })
						.limit(1);
					return balance[0]?.amount ?? 0;
				},
			),
		]);

		const senderNewBalance = senderBalance - parsedValue;
		const receiverNewBalance = receiverBalance + parsedValue;

		// save the new balances to the database
		Balance.create({
			account: from,
			amount: senderNewBalance,
			token: address,
			timestamp,
		});
		Balance.create({
			account: to,
			amount: receiverNewBalance,
			token: address,
			timestamp,
		});
	};`;

	await mkDir(join(newDir, "handlers"));
	writeFile(
		join(newDir, "handlers"),
		"transfer.ts",
		handler,
		options.overwrite,
	);

	const abi = `export default [{
	"inputs": [],
	"stateMutability": "nonpayable",
	"type": "constructor",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "uint256",
		"name": "chainId",
		"type": "uint256",
	}],
	"name": "AddSupportedChainId",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "address",
		"name": "contractAddress",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "supplyIncrement",
		"type": "uint256",
	}],
	"name": "AddSwapToken",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": true,
		"internalType": "address",
		"name": "owner",
		"type": "address",
	}, {
		"indexed": true,
		"internalType": "address",
		"name": "spender",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "value",
		"type": "uint256",
	}],
	"name": "Approval",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "address",
		"name": "newBridgeRoleAddress",
		"type": "address",
	}],
	"name": "MigrateBridgeRole",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "address",
		"name": "to",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "amount",
		"type": "uint256",
	}, {
		"indexed": false,
		"internalType": "address",
		"name": "feeAddress",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "feeAmount",
		"type": "uint256",
	}, {
		"indexed": false,
		"internalType": "bytes32",
		"name": "originTxId",
		"type": "bytes32",
	}],
	"name": "Mint",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "address",
		"name": "contractAddress",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "supplyDecrement",
		"type": "uint256",
	}],
	"name": "RemoveSwapToken",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "address",
		"name": "token",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "amount",
		"type": "uint256",
	}],
	"name": "Swap",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": true,
		"internalType": "address",
		"name": "from",
		"type": "address",
	}, {
		"indexed": true,
		"internalType": "address",
		"name": "to",
		"type": "address",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "value",
		"type": "uint256",
	}],
	"name": "Transfer",
	"type": "event",
}, {
	"anonymous": false,
	"inputs": [{
		"indexed": false,
		"internalType": "uint256",
		"name": "amount",
		"type": "uint256",
	}, {
		"indexed": false,
		"internalType": "uint256",
		"name": "chainId",
		"type": "uint256",
	}],
	"name": "Unwrap",
	"type": "event",
}, {
	"inputs": [{
		"internalType": "uint256",
		"name": "chainId",
		"type": "uint256",
	}],
	"name": "addSupportedChainId",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "contractAddress",
		"type": "address",
	}, {
		"internalType": "uint256",
		"name": "supplyIncrement",
		"type": "uint256",
	}],
	"name": "addSwapToken",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [
		{ "internalType": "address", "name": "owner", "type": "address" },
		{ "internalType": "address", "name": "spender", "type": "address" },
	],
	"name": "allowance",
	"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "spender",
		"type": "address",
	}, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
	"name": "approve",
	"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "account",
		"type": "address",
	}],
	"name": "balanceOf",
	"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "uint256",
		"name": "amount",
		"type": "uint256",
	}],
	"name": "burn",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "account",
		"type": "address",
	}, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
	"name": "burnFrom",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
	"name": "chainIds",
	"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [],
	"name": "decimals",
	"outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "spender",
		"type": "address",
	}, {
		"internalType": "uint256",
		"name": "subtractedValue",
		"type": "uint256",
	}],
	"name": "decreaseAllowance",
	"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "spender",
		"type": "address",
	}, { "internalType": "uint256", "name": "addedValue", "type": "uint256" }],
	"name": "increaseAllowance",
	"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "newBridgeRoleAddress",
		"type": "address",
	}],
	"name": "migrateBridgeRole",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [
		{ "internalType": "address", "name": "to", "type": "address" },
		{ "internalType": "uint256", "name": "amount", "type": "uint256" },
		{ "internalType": "address", "name": "feeAddress", "type": "address" },
		{ "internalType": "uint256", "name": "feeAmount", "type": "uint256" },
		{ "internalType": "bytes32", "name": "originTxId", "type": "bytes32" },
	],
	"name": "mint",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [],
	"name": "name",
	"outputs": [{ "internalType": "string", "name": "", "type": "string" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "contractAddress",
		"type": "address",
	}, {
		"internalType": "uint256",
		"name": "supplyDecrement",
		"type": "uint256",
	}],
	"name": "removeSwapToken",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [
		{ "internalType": "address", "name": "token", "type": "address" },
		{ "internalType": "uint256", "name": "amount", "type": "uint256" },
	],
	"name": "swap",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
	"name": "swapSupply",
	"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [],
	"name": "symbol",
	"outputs": [{ "internalType": "string", "name": "", "type": "string" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [],
	"name": "totalSupply",
	"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
	"stateMutability": "view",
	"type": "function",
}, {
	"inputs": [{
		"internalType": "address",
		"name": "recipient",
		"type": "address",
	}, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
	"name": "transfer",
	"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [
		{ "internalType": "address", "name": "sender", "type": "address" },
		{ "internalType": "address", "name": "recipient", "type": "address" },
		{ "internalType": "uint256", "name": "amount", "type": "uint256" },
	],
	"name": "transferFrom",
	"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
	"stateMutability": "nonpayable",
	"type": "function",
}, {
	"inputs": [
		{ "internalType": "uint256", "name": "amount", "type": "uint256" },
		{ "internalType": "uint256", "name": "chainId", "type": "uint256" },
	],
	"name": "unwrap",
	"outputs": [],
	"stateMutability": "nonpayable",
	"type": "function",
}] as const;`;

	await mkDir(join(newDir, "abis"));
	writeFile(join(newDir, "abis"), "erc20.ts", abi, options.overwrite);

	const deps = `export { formatUnits } from "npm:viem";
export {
  createEntity,
  type EventHandlerFor,
  Manifest,
} from "https://deno.land/x/robo_arkiver@${version}/mod.ts";`;

	writeFile(newDir, "deps.ts", deps, options.overwrite);
};

const encoder = new TextEncoder();

const writeFile = async (
	dir: string,
	filename: string,
	content: string,
	overwrite?: boolean,
) => {
	try {
		await Deno.writeFile(
			join(dir, filename),
			encoder.encode(content),
			{ createNew: !overwrite },
		);
	} catch (e) {
		if (e instanceof Deno.errors.AlreadyExists) {
			console.error(`File ${filename} already exists.`);
			Deno.exit(1);
		}
		throw e;
	}
};

const mkDir = async (dir: string) => {
	try {
		await Deno.mkdir(dir);
	} catch (e) {
		if (!(e instanceof Deno.errors.AlreadyExists)) {
			throw e;
		}
	}
};
