import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "npm:ethers@6.0.2";
import { EventHandler } from "@types";
import { getFromStore } from "@utils";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  provider,
}) => {
  if (!(event instanceof ethers.EventLog)) {
    return [];
  }

  const [repayer, borrower, repayAmount] = event.args;
  const address = contract.target.toString();

  const symbol = await getFromStore(
    store,
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const underlying = await getFromStore(
    store,
    `${address}-underlying`,
    async () => {
      if (!contract.interface.getFunction("underlying")) {
        return "AVAX";
      }
      return await contract.underlying();
    },
  ) as string;

  const underlyingDecimals = await getFromStore(
    store,
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

  const underlyingSymbol = await getFromStore(
    store,
    `${address}-underlyingSymbol`,
    async () => {
      if (underlying === "AVAX") {
        return "AVAX";
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function symbol() view returns (string)",
      ], provider);
      return await underlyingContract.symbol();
    },
  );

  const formattedRepayAmount = ethers.formatUnits(
    repayAmount,
    underlyingDecimals as number,
  );

  return [
    new Point("repay")
      .tag("repayer", repayer)
      .tag("borrower", borrower)
      .tag("underlying", underlying)
      .tag("underlyingSymbol", underlyingSymbol as string)
      .tag("symbol", symbol)
      .floatField(
        "amount",
        parseFloat(formattedRepayAmount),
      ),
  ];
};

export default handler;