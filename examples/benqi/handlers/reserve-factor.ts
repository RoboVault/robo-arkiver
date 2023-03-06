import { ethers, EventHandler, Point } from "../deps.ts";
import { getTimestampFromEvent } from "../shared.ts";

const handler: EventHandler = ({
  event,
  contract,
  db,
  store,
  tempStore,
}) => {
  const [_oldReserveFactor, newReserveFactor] = event.args;
  const address = contract.target.toString();

  console.log(
    `Reserve factor changed for ${address} to ${
      ethers.formatUnits(newReserveFactor, 18)
    }`,
  );

  store.set(`${address}-reserve-factor`, newReserveFactor);

  const timestamp = getTimestampFromEvent(event, tempStore);

  timestamp.then((timestamp) => {
    db.writer.writePoint(
      new Point("reserve-factor")
        .tag("address", address)
        .floatField(
          "value",
          parseFloat(
            ethers.formatUnits(newReserveFactor, 18),
          ),
        )
        .timestamp(timestamp),
    );
  });

  return Promise.resolve();
};

export default handler;
