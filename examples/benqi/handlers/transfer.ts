import { ethers, Point } from "../deps.ts";
import { EventHandler } from "@types";
import { getAccountTvl, getPrice } from "../shared.ts";

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

  const exchangeRateQ = await db.reader.collectRows<{ _value: number }>(`
    from(bucket: "arkiver")
      |> range(start: -24h)
      |> filter(fn: (r) => r._measurement == "exchange_rate" and r.symbol == "${symbol}")
      |> median()
  `);

  const exchangeRate = exchangeRateQ[0]?._value;

  db.writer.writePoints([
    new Point("transfers")
      .tag("from", from)
      .tag("to", to)
      .floatField("total", formattedValue),
  ]);

  if (exchangeRate === undefined) {
    return;
  }

  const priceUsd = await getPrice(db, symbol);

  const senderTvl = await getAccountTvl(db, from, symbol);
  const newSenderTvl = senderTvl - formattedValue * exchangeRate;
  const newSenderTvlUsd = newSenderTvl * priceUsd;

  const receiverTvl = await getAccountTvl(db, to, symbol);
  const newReceiverTvl = receiverTvl + formattedValue * exchangeRate;
  const newReceiverTvlUsd = newReceiverTvl * priceUsd;

  const timestamp = (await event.getBlock()).timestamp;

  db.writer.writePoints([
    new Point("tvl")
      .tag("account", from)
      .tag("symbol", symbol)
      .floatField("amount", newSenderTvl)
      .timestamp(timestamp),
    new Point("tvl")
      .tag("account", from)
      .tag("symbol", "usd")
      .floatField("amount", newSenderTvlUsd)
      .timestamp(timestamp),
    new Point("tvl")
      .tag("account", to)
      .tag("symbol", symbol)
      .floatField("amount", newReceiverTvl)
      .timestamp(timestamp),
    new Point("tvl")
      .tag("account", to)
      .tag("symbol", "usd")
      .floatField("amount", newReceiverTvlUsd)
      .timestamp(timestamp),
  ]);
};

export default handler;
