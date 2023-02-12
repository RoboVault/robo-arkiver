import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "npm:ethers@6.0.2";
import { EventHandler } from "@types";
import { getFromStore } from "@utils";

const handler: EventHandler = async ({
  contract,
  event,
  store,
}) => {
  if (!(event instanceof ethers.EventLog)) {
    return [];
  }

  const [liquidator, borrower, repayAmount, qiTokenCollateral, seizeAmount] =
    event.args;
  const address = contract.target.toString();

  // ---------REPAY UNDERLYING---------
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
    `${underlying}-decimals`,
    async () => {
      if (underlying === "AVAX") {
        return 18;
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function decimals() view returns (uint8)",
      ], contract.runner);
      return await underlyingContract.decimals();
    },
  );

  const underlyingSymbol = await getFromStore(
    store,
    `${underlying}-symbol`,
    async () => {
      if (underlying === "AVAX") {
        return "AVAX";
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function symbol() view returns (string)",
      ], contract.runner);
      return await underlyingContract.symbol();
    },
  );

  // ---------SEIZE QITOKEN---------
  // contract of collateral qi token
  const qiTokenCollateralContract = new ethers.Contract(qiTokenCollateral, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ], contract.runner);

  const qiTokenCollateralSymbol = await getFromStore(
    store,
    `${qiTokenCollateral}-symbol`,
    qiTokenCollateralContract.symbol,
  ) as string;

  const qiTokenCollateralDecimals = await getFromStore(
    store,
    `${qiTokenCollateral}-decimals`,
    qiTokenCollateralContract.decimals,
  ) as number;

  const formattedRepayAmount = ethers.formatUnits(
    repayAmount,
    underlyingDecimals as number,
  );

  const formattedSeizeAmount = ethers.formatUnits(
    seizeAmount,
    qiTokenCollateralDecimals as number,
  );

  return [
    new Point("liquidate")
      .tag("liquidator", liquidator)
      .tag("borrower", borrower)
      .tag("repayUnderlyingAddress", underlying) // address of underlying token being repaid
      .tag("repayUnderlyingSymbol", underlyingSymbol as string) // symbol of underlying token being repaid
      .tag("seizedQiTokenAddress", qiTokenCollateral) // address of QiToken collateral being seized
      .tag("seizedQiTokenSymbol", qiTokenCollateralSymbol) // symbol of QiToken collateral being seized
      .floatField(
        "repayAmount", // amount of underlying token being repaid
        parseFloat(formattedRepayAmount),
      )
      .floatField(
        "seizeAmount", // amount of QiToken collateral being seized
        parseFloat(formattedSeizeAmount),
      ),
  ];
};

export default handler;
