import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "https://esm.sh/ethers@6.0.2";
import {
  types,
  utils,
} from "https://deno.land/x/robo_arkiver@v0.0.3/lib/mod.ts";

const handler: types.EventHandler = async ({
  contract,
  event,
  store,
}) => {
  if (!(event instanceof ethers.EventLog)) {
    return utils.error(`Event args are missing: ${event}`);
  }

  const [borrower, borrowAmount] = event.args;

  const symbol = await utils.getFromStore(
    store,
    `${contract.address}-symbol`,
    contract.symbol,
  ) as string;

  const underlying = await utils.getFromStore(
    store,
    `${contract.address}-underlying`,
    async () => {
      if (!contract.underlying) {
        return "AVAX";
      }
      return await contract.underlying();
    },
  ) as string;

  const underlyingDecimals = await utils.getFromStore(
    store,
    `${contract.address}-underlyingDecimals`,
    async () => {
      if (underlying === "AVAX") {
        return 18;
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function decimals() view returns (uint8)",
      ], contract.runner!.provider);
      return await underlyingContract.decimals();
    },
  );

  const underlyingSymbol = await utils.getFromStore(
    store,
    `${contract.address}-underlyingSymbol`,
    async () => {
      if (underlying === "AVAX") {
        return "AVAX";
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function symbol() view returns (string)",
      ], contract.runner!.provider);
      return await underlyingContract.symbol();
    },
  );

  const formattedBorrowAmount = ethers.formatUnits(
    borrowAmount,
    underlyingDecimals as number,
  );

  return [
    new Point("borrow")
      .tag("borrower", borrower)
      .tag("underlying", underlying)
      .tag("underlyingSymbol", underlyingSymbol as string)
      .tag("symbol", symbol)
      .floatField(
        "amount",
        parseFloat(formattedBorrowAmount),
      ),
  ];
};

export default handler;
