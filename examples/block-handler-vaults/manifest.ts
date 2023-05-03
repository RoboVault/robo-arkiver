import { Manifest } from "https://deno.land/x/robo_arkiver@v0.4.4/mod.ts";
import { VaultSnapshot } from "./entities/vault.ts";
import { snapshotVault } from "./handlers/vault.ts";

const manifest = new Manifest("yearn-vaults");

manifest
	.addEntity(VaultSnapshot)
	.chain("mainnet")
	.addBlockHandler({ blockInterval: 1000, startBlockHeight: 12790000n, handler: snapshotVault })

export default manifest
	.build();