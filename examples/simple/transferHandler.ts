import { EventHandlerFor, formatUnits } from "./deps.ts";
import erc20 from "./erc20.ts";
import { Balance } from "./entities.ts";

export const transferHandler: EventHandlerFor<typeof erc20, "Transfer"> =
  async (
    { event, client, store },
  ) => {
    const { from, to, value } = event.args;

    const address = event.address;

    const decimals = await store.retrieve(
      `${address}:decimals`,
      async () =>
        await client.readContract({
          abi: erc20,
          functionName: "decimals",
          address,
        }),
    );

    const formattedValue = parseFloat(formatUnits(value, decimals));

    const senderBalance = await store.retrieve(
      `${from}:${address}:balance`,
      async () =>
        (await Balance.findOneBy({ id: `${from}:${address}` }))?.amount ??
          0,
    );

    const receiverBalance = await store.retrieve(
      `${to}:${address}:balance`,
      async () =>
        (await Balance.findOneBy({ id: `${to}:${address}` }))?.amount ?? 0,
    );

    const newSenderBalance = senderBalance - formattedValue;
    const newReceiverBalance = receiverBalance + formattedValue;

    store.set(`${from}:${address}:balance`, newSenderBalance);
    store.set(`${to}:${address}:balance`, newReceiverBalance);

    await Balance.upsert([
      {
        id: `${from}:${address}`,
        amount: newSenderBalance,
        token: address,
        account: from,
      },
      {
        id: `${to}:${address}`,
        amount: newReceiverBalance,
        token: address,
        account: to,
      },
    ], ["id"]);
  };
