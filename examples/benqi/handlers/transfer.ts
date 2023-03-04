import { ethers, EventHandler, logger, Point } from "../deps.ts";
import { getTimestampFromEvent, writeTvlChange } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
  tempStore,
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

  const amount = formattedValue * exchangeRate;

  const timestamp = getTimestampFromEvent(event, tempStore);

  await writeTvlChange({
    db,
    account: from,
    amount: -amount,
    blockHeight: event.blockNumber,
    store,
    symbol,
    timestamp,
  });

  writeTvlChange({
    db,
    account: to,
    amount,
    blockHeight: event.blockNumber,
    store,
    symbol,
    timestamp,
  });
};

export default handler;
