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

  const [from, to, value] = event.args;

  const decimals = (await utils.getFromStore(
    store,
    `${contract.address}-decimals`,
    contract.decimals,
  )) as number;

  const formattedValue = ethers.utils.formatUnits(value, decimals);

  const senderPoint = new Point("transfers")
    .tag("owner", from)
    .floatField("total", -parseFloat(formattedValue));

  const receiverPoint = new Point("transfers")
    .tag("owner", to)
    .floatField("total", parseFloat(formattedValue));

  return [senderPoint, receiverPoint];
};

export default handler;
