import { BlockHandlerFn, logger, Point } from "../deps.ts";
import { getAccountTvl, getPrice, qiTokens } from "../shared.ts";

const handler: BlockHandlerFn = async ({
  db,
  store,
  block,
}) => {
  const prices: Record<string, number> = {};
  for (const qiToken of qiTokens) {
    const price = await getPrice(db, store, qiToken.symbol);
    prices[qiToken.symbol] = price;
  }

  const withdrawals = await db.reader.collectRows<{ withdrawer: string }>(`
		from(bucket: "arkiver")
			|> range(start: -1d, stop: now())
			|> filter(fn: (r) => r._measurement == "withdraw" and r._field == "amount")
			|> group(columns: ["withdrawer"])
			|> last()
			|> keep(columns: ["withdrawer"])
	`);

  for (const { withdrawer } of withdrawals) {
    const highestBalances = await db.reader.collectRows<
      { _value: number; symbol: string }
    >(`
			from(bucket: "arkiver")
				|> range(start:0)
				|> filter(fn: (r) => r._measurement == "tvl" and r._field == "amount" and r.account == "${withdrawer}" and not r.symbol =~ /usd$/)
				|> group(columns: ["symbol"])
				|> max()
				|> keep(columns: ["_value", "symbol"])
		`);

    let highestTotalBalance = 0;
    let currentTotalBalance = 0;

    for (const { _value, symbol } of highestBalances) {
      const currentBalance = await getAccountTvl(db, store, withdrawer, symbol);
      const price = prices[symbol];

      if (!price) {
        logger.warning(`User retention: No price found for ${symbol}`);
        continue;
      }

      highestTotalBalance += _value * price;
      currentTotalBalance += currentBalance * price;
    }

    const retention = currentTotalBalance / highestTotalBalance;

    if (isFinite(retention) && retention < 0.1) {
      db.writer.writePoint(
        new Point("users_lost")
          .tag("account", withdrawer)
          .floatField("retention", currentTotalBalance / highestTotalBalance)
          .timestamp(block.timestamp),
      );
    }
  }
};

export default handler;
