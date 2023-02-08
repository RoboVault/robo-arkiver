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

  const [liquidator, borrower, repayAmount, qiTokenCollateral, seizeAmount] =
    event.args;

  // ---------REPAY UNDERLYING---------
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
    `${underlying}-decimals`,
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
    `${underlying}-symbol`,
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

  // ---------SEIZE QITOKEN---------
  // contract of collateral qi token
  const qiTokenCollateralContract = new ethers.Contract(qiTokenCollateral, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ], contract.runner!.provider);

  const qiTokenCollateralSymbol = await utils.getFromStore(
    store,
    `${qiTokenCollateral}-symbol`,
    qiTokenCollateralContract.symbol,
  ) as string;

  const qiTokenCollateralDecimals = await utils.getFromStore(
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
