import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "https://esm.sh/ethers@5.7.2";
import {
  types,
  utils,
} from "https://deno.land/x/robo_arkiver@v0.0.2/lib/mod.ts";

const handler: types.EventHandler = async ({
  contract,
  event,
  store,
}) => {
  if (!event.args) {
    return utils.error(`Event args are missing: ${event}`);
  }

  const [minter, mintAmount, mintTokens] = event.args;

  const decimals = (await utils.getFromStore(
    store,
    `${contract.address}-decimals`,
    contract.decimals,
  )) as number;

  return [];
};

export default handler;
