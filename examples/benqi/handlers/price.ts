import { ethers, EventHandler } from "../deps.ts";
import { setPrice } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
}) => {
  const [answer] = event.args;

  const decimals = await store.retrieve(
    `${contract.target.toString()}-decimals`,
    contract.decimals,
  ) as number;

  const pair = await store.retrieve(
    `${contract.target.toString()}-pair`,
    contract.description,
  ) as string;

  setPrice(
    db,
    store,
    pair,
    parseFloat(ethers.formatUnits(answer, decimals)),
    event.blockNumber,
  );
};

export default handler;
