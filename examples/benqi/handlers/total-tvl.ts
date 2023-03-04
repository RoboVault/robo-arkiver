import { BlockHandlerFn } from "../deps.ts";
import { getAccountTvls, setAccountTvl } from "../shared.ts";

const handler: BlockHandlerFn = async ({
  block,
  db,
  store,
}) => {
  const totalTvls = await getAccountTvls(db, store, "total", block.number);

  const totalTvlUsd = totalTvls.usd;

  setAccountTvl({
    db,
    store,
    account: "total",
    symbol: "USD",
    amount: totalTvlUsd,
    blockHeight: block.number,
    timestamp: Promise.resolve(block.timestamp),
    noSetStore: true,
  });
};

export default handler;
