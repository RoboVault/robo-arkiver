import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "https://esm.sh/ethers@6.0.2";
import {
  types,
  utils,
} from "https://deno.land/x/robo_arkiver@v0.0.3/lib/mod.ts";

const handler: types.EventHandler = async ({
  contract,
  event,
  store,
}) => {
  if (!(event instanceof ethers.EventLog)) {
    return utils.error(`Event args are missing: ${event}`);
  }

  const [from, to, value] = event.args;

  const decimals = (await utils.getFromStore(
    store,
    `${contract.address}-decimals`,
    contract.decimals,
  )) as number;

  const formattedValue = ethers.formatUnits(value, decimals);

  return [
    new Point("transfers")
      .tag("from", from)
      .tag("to", to)
      .floatField("total", parseFloat(formattedValue)),
  ];
};

export default handler;
