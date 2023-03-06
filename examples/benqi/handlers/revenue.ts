import {
  ethers,
  EventHandler,
  logger,
  Point,
  QueryApi,
  Store,
} from "../deps.ts";
import {
  getPrice,
  getTimestampFromEvent,
  getUnderlyingAmount,
} from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
  tempStore,
}) => {
  const [_, interestAccumulated] = event.args;

  if (interestAccumulated === 0n) return;

  const address = contract.target.toString();

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const reserveFactor = await getReserveFactor(db, store, address);

  const price = await getPrice(db, store, symbol);

  const protocolRevenue = interestAccumulated as bigint * reserveFactor /
    ethers.WeiPerEther;
  const formattedProtocolRevenue = await getUnderlyingAmount(
    protocolRevenue,
    contract,
    store,
  );
  const protocolRevenueUsd = formattedProtocolRevenue * price;

  const lpRevenue = interestAccumulated as bigint - protocolRevenue;
  const formattedLpRevenue = await getUnderlyingAmount(
    lpRevenue,
    contract,
    store,
  );
  const lpRevenueUsd = formattedLpRevenue * price;

  const timestamp = getTimestampFromEvent(event, tempStore);

  timestamp.then((timestamp) => {
    db.writer.writePoint(
      new Point("revenue")
        .tag("symbol", symbol)
        .floatField("protocol", formattedProtocolRevenue)
        .floatField("protocol-usd", protocolRevenueUsd)
        .floatField("lp", formattedLpRevenue)
        .floatField("lp-usd", lpRevenueUsd)
        .timestamp(timestamp),
    );
  });
};

export default handler;

const getReserveFactor = async (
  db: { reader: QueryApi },
  store: Store,
  address: string,
) => {
  const reserveFactor = await store.retrieve(
    `${address}-reserve-factor`,
    async () => {
      const res = await db.reader.collectRows<{ _value: number }>(`
			from(bucket: "arkiver")
				|> range(start: 0)
				|> filter(fn: (r) => r._measurement == "reserve-factor" and r._field == "value" and r.address == "${address}")
				|> last()
		`);
      if (res.length === 0) {
        logger.error(
          `No reserve factor found for ${address}, using 0.2`,
        );
      }
      return ethers.parseUnits(
        (res[0]?._value || 0.2).toLocaleString("fullwide", {
          maximumFractionDigits: 18,
        }),
        18,
      );
    },
  );
  return reserveFactor as bigint;
};
