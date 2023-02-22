import { logger, Point } from "../../lib/deps.ts";
import { QueryApi, WriteApi } from "./deps.ts";

export const symbolToPair = (symbol: string) => {
  const pair = pairs[symbol];
  if (!pair) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }
  return pair;
};

const pairs = {
  "qiBTC.b": "BTC / USD",
  "qiBTC": "BTC / USD",
  "qisAVAX": "Calculated SAVAX / USD",
  "qiETH": "ETH / USD",
  "qiLINK": "LINK / USD",
  "qiAVAX": "AVAX / USD",
  "qiQI": "QI / USD",
  "qiBUSD": "USD",
  "qiDAI": "USD",
  "qiUSDC": "USD",
  "qiUSDT": "USD",
  "qiUSDCn": "USD",
  "qiUSDTn": "USD",
} as Record<string, string>;

export const getPrice = async (db: { reader: QueryApi }, symbol: string) => {
  const pair = symbolToPair(symbol);
  let priceUsd = pair === "USD" ? 1 : 0;

  if (priceUsd === 0) {
    const res = await db.reader.collectRows<{ _value: number }>(`
    from(bucket: "arkiver")
      |> range(start: 0)
      |> filter(fn: (r) => r._measurement == "price" and r._field == "usd" and r.pair == "${pair}")
      |> last()
  `);
    if (!res[0]) {
      logger.error(`No price found for ${pair}`);
    } else {
      priceUsd = res[0]._value;
    }
  }

  return priceUsd;
};

export const getAccountTvl = async (
  db: { reader: QueryApi },
  account: string,
  symbol: string,
) => {
  const res = await db.reader.collectRows<{ _value: number }>(`
    from(bucket: "arkiver")
      |> range(start: 0)
      |> filter(fn: (r) => r._measurement == "tvl" and r._field == "amount" and r.account == "${account}" and r.symbol == "${symbol}")
      |> last()
  `);

  return res[0]?._value || 0;
};

export const writeTvlChange = async (
  db: { writer: WriteApi; reader: QueryApi },
  account: string,
  symbol: string,
  amount: number,
  timestamp: number,
) => {
  const priceUsd = await getPrice(db, symbol);

  const amountUsd = amount * priceUsd;

  const accountTvl = await getAccountTvl(db, account, symbol);
  const newAccountTvl = accountTvl + amount;
  const newAccountTvlUsd = newAccountTvl * priceUsd;

  const tokenTvl = await getAccountTvl(db, symbol, symbol);
  const newTokenTvl = tokenTvl + amount;
  const newTokenTvlUsd = newTokenTvl * priceUsd;

  const totalTvl = await getAccountTvl(db, "total", "usd");
  const newTotalTvl = totalTvl + amountUsd;

  const accountPoints = [
    new Point("tvl")
      .tag("account", account)
      .tag("symbol", symbol)
      .floatField("amount", newAccountTvl)
      .timestamp(timestamp),
    new Point("tvl")
      .tag("account", account)
      .tag("symbol", "usd")
      .floatField("amount", newAccountTvlUsd)
      .timestamp(timestamp),
  ];

  const tokenPoints = [
    new Point("tvl")
      .tag("account", symbol)
      .tag("symbol", symbol)
      .floatField("amount", newTokenTvl)
      .timestamp(timestamp),
    new Point("tvl")
      .tag("account", symbol)
      .tag("symbol", "usd")
      .floatField("amount", newTokenTvlUsd)
      .timestamp(timestamp),
  ];

  const totalPoints = new Point("tvl")
    .tag("account", "total")
    .tag("symbol", "usd")
    .floatField("amount", newTotalTvl)
    .timestamp(timestamp);

  db.writer.writePoints(
    [
      ...accountPoints,
      ...tokenPoints,
      totalPoints,
    ],
  );
};
