import { join } from "../deps.ts";

export const action = async (options: { overwrite?: boolean }, dir: string) => {
	const newDir = join(Deno.cwd(), dir);

	mkDir(newDir);

	const manifest = `import { Manifest } from "./deps.ts";
import erc20 from "./abis/erc20.ts";
import { Balance } from "./entities/balance.ts";
import { transferHandler } from "./handlers/transfer.ts";

const manifest = new Manifest("my-arkive");

manifest
	.chain("avalanche")
	.contract(erc20)
	.addSources({ "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664": 27347402n })
	.addEventHandlers({ "Transfer": transferHandler });

export default manifest
	.addEntity(Balance)
	.build();`;

	writeFile(newDir, "manifest.ts", manifest, options.overwrite);

	const entities = `import { createEntity } from "../deps.ts";

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
`;

	await mkDir(join(newDir, "entities"));
	writeFile(
		join(newDir, "entities"),
		"balance.ts",
		entities,
		options.overwrite,
	);

	const handler = `import { EventHandlerFor, formatUnits } from "../deps.ts";
import erc20 from "../abis/erc20.ts";
import { Balance } from "../entities/balance.ts";

export const transferHandler: EventHandlerFor<typeof erc20, "Transfer"> =
  async (
    { event, client, store },
  ) => {
    const { from, to, value } = event.args;

    const address = event.address;

    // store.retrieve() is a wrapper around Map.get() that will
    // call the provided function if the key is not found in the store.
    const decimals = await store.retrieve(
      \`\${address}:decimals\`,
      async () =>
        await client.readContract({
          abi: erc20,
          functionName: "decimals",
          address,
        }),
    );

    const parsedValue = parseFloat(formatUnits(value, decimals));

    const [senderBalance, receiverBalance] = await Promise.all([
      store.retrieve(
        \`\${from}:\${address}:balance\`,
        async () =>
          await Balance.findOne({ account: from }) ??
            new Balance({
              amount: 0,
              token: address,
              account: from,
            }),
      ),
      store.retrieve(
        \`\${to}:\${address}:balance\`,
        async () =>
          await Balance.findOne({ account: to }) ??
            new Balance({
              amount: 0,
              token: address,
              account: to,
            }),
      ),
    ]);

    senderBalance.amount -= parsedValue;
    receiverBalance.amount += parsedValue;

    store.set(\`\${from}:\${address}:balance\`, senderBalance.save());
    store.set(\`\${to}:\${address}:balance\`, receiverBalance.save());
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
} from "https://deno.land/x/robo_arkiver/mod.ts";`;

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
