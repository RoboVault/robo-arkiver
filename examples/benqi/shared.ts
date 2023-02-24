import { Store } from "../../lib/arkiver/store.ts";
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

export const getPrice = async (
  db: { reader: QueryApi },
  store: Store,
  symbol: string,
) => {
  const pair = symbolToPair(symbol);
  let priceUsd = pair === "USD" ? 1 : 0;

  if (priceUsd === 1) return priceUsd;

  const stored = await store.retrieve(pair, async () => {
    const res = await db.reader.collectRows<{ _value: number }>(`
      from(bucket: "arkiver")
        |> range(start: 0)
        |> filter(fn: (r) => r._measurement == "price" and r._field == "price" and r.pair == "${pair}")
        |> last()
    `);
    if (!res[0]) {
      logger.error(`No price found for ${pair}`);
    } else {
      return res[0]._value;
    }
  }) as number;

  priceUsd = stored;

  return priceUsd;
};

export const setPrice = (
  db: { writer: WriteApi },
  store: Store,
  pair: string,
  price: number,
  blockHeight: number,
) => {
  store.set(pair, price);

  const point = new Point("price")
    .tag("pair", pair)
    .floatField("price", price)
    .intField("blockHeight", blockHeight)
    .timestamp(0);

  db.writer.writePoint(point);
};

export const getAccountTvl = async (
  db: { reader: QueryApi },
  store: Store,
  account: string,
  symbol: string,
) => {
  const tvl = await store.retrieve(`${account}-tvl-${symbol}`, async () => {
    const res = await db.reader.collectRows<{ _value: number }>(`
      from(bucket: "arkiver")
        |> range(start: 0)
        |> filter(fn: (r) => r._measurement == "tvl" and r._field == "amount" and r.account == "${account}" and r.symbol == "${symbol}")
        |> last()
    `);

    return res[0]?._value || 0;
  });
  return tvl as number;
};

export const setAccountTvl = (
  params: {
    db: { writer: WriteApi };
    store: Store;
    account: string;
    symbol: string;
    amount: number;
    blockHeight: number;
    timestamp: number;
    noSetStore?: boolean;
  },
) => {
  const {
    db,
    store,
    account,
    symbol,
    amount,
    blockHeight,
    timestamp,
    noSetStore,
  } = params;

  if (!noSetStore) store.set(`${account}-tvl-${symbol}`, amount);

  const point = new Point("tvl")
    .tag("account", account)
    .tag("symbol", symbol)
    .floatField("amount", amount)
    .intField("blockHeight", blockHeight)
    .timestamp(timestamp);

  db.writer.writePoint(point);
};

export const writeTvlChange = async (
  params: {
    db: { writer: WriteApi; reader: QueryApi };
    store: Store;
    account: string;
    symbol: string;
    amount: number;
    timestamp: number;
    blockHeight: number;
  },
) => {
  const { db, store, account, symbol, amount, timestamp, blockHeight } = params;

  const priceUsd = await getPrice(db, store, symbol);
  const amountUsd = amount * priceUsd;

  const accountTvl = await getAccountTvl(db, store, account, symbol);
  const accountTvlUsd = await getAccountTvl(db, store, account, "usd");
  const newAccountTvl = accountTvl + amount;
  const newAccountTvlUsd = accountTvlUsd + amountUsd;

  const tokenTvl = await getAccountTvl(db, store, symbol, symbol);
  const newTokenTvl = tokenTvl + amount;
  const newTokenTvlUsd = newTokenTvl * priceUsd;

  const totalTvl = await getAccountTvl(db, store, "total", "usd");
  const newTotalTvl = totalTvl + amountUsd;

  setAccountTvl({
    db,
    store,
    account,
    symbol,
    amount: newAccountTvl,
    blockHeight,
    timestamp,
  });
  setAccountTvl({
    db,
    store,
    account,
    symbol: "usd",
    amount: newAccountTvlUsd,
    blockHeight,
    timestamp,
  });

  setAccountTvl({
    db,
    store,
    account: symbol,
    symbol,
    amount: newTokenTvl,
    blockHeight,
    timestamp,
  });
  setAccountTvl({
    db,
    store,
    account: symbol,
    symbol: "usd",
    amount: newTokenTvlUsd,
    blockHeight,
    timestamp,
    noSetStore: true,
  });

  setAccountTvl({
    db,
    store,
    account: "total",
    symbol: "usd",
    amount: newTotalTvl,
    blockHeight,
    timestamp,
  });
};

export const setAndForget = (
  params: {
    key: string;
    store: Store;
    // deno-lint-ignore no-explicit-any
    value: any;
    db: { writer: WriteApi };
    points: Point[];
  },
) => {
  const { key, store, value, db, points } = params;

  store.set(key, value);

  db.writer.writePoints(points);
};
