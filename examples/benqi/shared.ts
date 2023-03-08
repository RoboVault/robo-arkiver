import { ethers, logger, Point, QueryApi, Store, WriteApi } from "./deps.ts";

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
  timestamp: Promise<number>,
) => {
  store.set(pair, price);

  timestamp.then((timestamp) => {
    const point = new Point("price")
      .tag("pair", pair)
      .floatField("price", price)
      .intField("blockHeight", blockHeight)
      .timestamp(timestamp);

    db.writer.writePoint(point);
  });
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
    timestamp: Promise<number>;
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

  timestamp.then((timestamp) => {
    const point = new Point("tvl")
      .tag("account", account)
      .tag("symbol", symbol)
      .floatField("amount", amount)
      .intField("blockHeight", blockHeight)
      .timestamp(timestamp);

    db.writer.writePoint(point);
  });
};

export const writeTvlChange = async (
  params: {
    db: { writer: WriteApi; reader: QueryApi };
    store: Store;
    account: string;
    symbol: string;
    amount: number;
    timestamp: Promise<number>;
    blockHeight: number;
  },
) => {
  const { db, store, account, symbol, amount, timestamp, blockHeight } = params;

  const price = await getPrice(db, store, symbol);

  // account tokens
  const accountTvl = await getAccountTvls(db, store, account, blockHeight);
  const newAccountTvl = accountTvl[symbol] + amount;
  const newAccountTvlUsd = accountTvl.usd + amount * price;

  // token total
  const tokenTvl = await getAccountTvl(db, store, "total", symbol);
  const newTokenTvl = tokenTvl + amount;
  const newTokenTvlUsd = newTokenTvl * price;

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
    symbol: "USD",
    amount: newAccountTvlUsd,
    blockHeight,
    timestamp,
  });

  setAccountTvl({
    db,
    store,
    account: "total",
    symbol,
    amount: newTokenTvl,
    blockHeight,
    timestamp,
  });
  setAccountTvl({
    db,
    store,
    account: "total",
    symbol: `${symbol}-USD`,
    amount: newTokenTvlUsd,
    blockHeight,
    timestamp,
  });
};

export const getTimestampFromEvent = async (
  event: ethers.EventLog,
  tempStore: Store,
) => {
  const block = await tempStore.retrieve(
    `block-${event.blockNumber}`,
    async () => await event.getBlock(),
  );
  return block.timestamp as number;
};

export const getAccountTvls = async (
  db: { reader: QueryApi },
  store: Store,
  account: string,
  blockHeight: number,
) => {
  const tvls: Record<
    string,
    number
  > = {};
  const prices: Record<string, number> = {};
  for (const { symbol, startBlockHeight } of qiTokens) {
    if (blockHeight < startBlockHeight) continue;

    const price = await getPrice(db, store, symbol);
    prices[symbol] = price;

    const tokenAmount = await getAccountTvl(db, store, account, symbol);
    tvls[symbol] = tokenAmount;
  }

  const totalUsd = Object.entries(tvls).reduce(
    (acc, [symbol, amount]) => acc + (amount * prices[symbol]),
    0,
  );
  tvls.usd = totalUsd;

  return tvls;
};

export const qiTokens = [
  {
    symbol: "qisAVAX",
    startBlockHeight: 26530000,
  },
  {
    symbol: "qiBTC.b",
    startBlockHeight: 16578216,
  },
  {
    symbol: "qiUSDCn",
    startBlockHeight: 26520000,
  },
  {
    symbol: "qiBTC",
    startBlockHeight: 3046690,
  },
  {
    symbol: "qiETH",
    startBlockHeight: 3046701,
  },
  {
    symbol: "qiLINK",
    startBlockHeight: 3046723,
  },
  {
    symbol: "qiUSDT",
    startBlockHeight: 3046718,
  },
  {
    symbol: "qiUSDC",
    startBlockHeight: 3620405,
  },
  {
    symbol: "qiUSDTn",
    startBlockHeight: 13319600,
  },
  {
    symbol: "qiDAI",
    startBlockHeight: 3046729,
  },
  {
    symbol: "qiBUSD",
    startBlockHeight: 21221137,
  },
  {
    symbol: "qiQI",
    startBlockHeight: 4408541,
  },
  {
    symbol: "qiAVAX",
    startBlockHeight: 3046672,
  },
] as const;

export const getUnderlyingAmount = async (
  amount: number | bigint,
  contract: ethers.Contract,
  store: Store,
) => {
  const address = contract.target.toString();
  const provider = contract.runner!.provider;

  const underlying = await store.retrieve(
    `${address}-underlying`,
    async () => {
      if (!contract.interface.getFunction("underlying")) {
        return "AVAX";
      }
      return await contract.underlying();
    },
  ) as string;

  const underlyingDecimals = await store.retrieve(
    `${address}-underlyingDecimals`,
    async () => {
      if (underlying === "AVAX") {
        return 18;
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function decimals() view returns (uint8)",
      ], provider);
      return await underlyingContract.decimals();
    },
  );

  const underlyingAmount = parseFloat(ethers.formatUnits(
    amount,
    underlyingDecimals as number,
  ));

  return underlyingAmount;
};
