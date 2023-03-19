import { Manifest } from "./deps.ts";
import { GLP } from "./entities.ts";
import { GlpHandler } from "./gmxHandler.ts";

const manifest = new Manifest();

manifest
	.addEntity(GLP)
	.addChain("arbitrum")
	.addBlockHandler({ blockInterval: 20000, startBlockHeight: BigInt(3000000), handler: GlpHandler })// 

export default manifest.build();
