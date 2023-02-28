import { ethers, EventHandler, logger, Point } from "../deps.ts";
import { getAccountTvl, getPrice, setAccountTvl } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
}) => {
  const [from, to, value] = event.args;
  const address = contract.target.toString();

  if (
    (<string> from).toLowerCase() === address.toLowerCase() ||
    (<string> to).toLowerCase() === address.toLowerCase()
  ) {
    return;
  }

  const decimals = (await store.retrieve(
    `${address}-decimals`,
    contract.decimals,
  )) as number;

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const formattedValue = parseFloat(ethers.formatUnits(value, decimals));

  const exchangeRate = await store.retrieve(
    `${symbol}-exchangeRate`,
    async () => {
      const res = await db.reader.collectRows<{ _value: number }>(`
    from(bucket: "arkiver")
      |> range(start: 0)
      |> filter(fn: (r) => r._measurement == "exchange_rate" and r.symbol == "${symbol}")
      |> last()
  `);

      const rate = res[0]?._value;
      if (rate === undefined) {
        logger.error(`exchangeRate undefined: ${symbol}`);
        return 0;
      }
      return rate;
    },
  ) as number;

  db.writer.writePoints([
    new Point("transfers")
      .tag("from", from)
      .tag("to", to)
      .floatField("total", formattedValue),
  ]);

  if (exchangeRate === undefined) {
    return;
  }

  const priceUsd = await getPrice(db, store, symbol);
  const amount = formattedValue * exchangeRate;
  const amountUsd = amount * priceUsd;

  const senderTvl = await getAccountTvl(db, store, from, symbol);
  const senderTvlUsd = await getAccountTvl(db, store, from, "usd");
  const newSenderTvl = senderTvl - amount;
  const newSenderTvlUsd = senderTvlUsd - amountUsd;

  const receiverTvl = await getAccountTvl(db, store, to, symbol);
  const receiverTvlUsd = await getAccountTvl(db, store, to, "usd");
  const newReceiverTvl = receiverTvl + amount;
  const newReceiverTvlUsd = receiverTvlUsd + amountUsd;

  const timestamp = async () => (await event.getBlock()).timestamp;

  setAccountTvl({
    db,
    store,
    account: from,
    symbol,
    amount: newSenderTvl,
    blockHeight: event.blockNumber,
    timestamp,
  });
  setAccountTvl({
    db,
    store,
    account: from,
    symbol: "usd",
    amount: newSenderTvlUsd,
    blockHeight: event.blockNumber,
    timestamp,
  });
  setAccountTvl({
    db,
    store,
    account: to,
    symbol,
    amount: newReceiverTvl,
    blockHeight: event.blockNumber,
    timestamp,
  });
  setAccountTvl({
    db,
    store,
    account: to,
    symbol: "usd",
    amount: newReceiverTvlUsd,
    blockHeight: event.blockNumber,
    timestamp,
  });
};

export default handler;
