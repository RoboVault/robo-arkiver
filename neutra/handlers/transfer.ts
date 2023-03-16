import { EventHandlerFor, formatUnits } from "../deps.ts"; 
import erc20 from "../abis/erc20.ts";
import { Balance } from "../entities/balance.ts";

export const transferHandler: EventHandlerFor<typeof erc20, "Transfer"> =
  async (
    { event, client, store },
  ) => {
    const { from, to, value } = event.args;

    const address = event.address;

    // store.retrieve() is a wrapper around Map.get() that will
    // call the provided function if the key is not found in the store.
    const decimals = await store.retrieve(
      `${address}:decimals`,
      async () =>
        await client.readContract({
          abi: erc20,
          functionName: "decimals",
          address,
        }),
    );

    const parsedValue = parseFloat(formatUnits(value, decimals));

    const [senderBalance, receiverBalance] = await Promise.all([
      store.retrieve(
        `${from}:${address}:balance`,
        async () =>
          await Balance.findOneBy({ id: `${from}:${address}` }) ??
            Object.assign(new Balance(), {
              id: `${from}:${address}`,
              amount: 0,
              token: address,
              account: from,
            }),
      ),
      store.retrieve(
        `${to}:${address}:balance`,
        async () =>
          await Balance.findOneBy({ id: `${to}:${address}` }) ??
            Object.assign(new Balance(), {
              id: `${to}:${address}`,
              amount: 0,
              token: address,
              account: to,
            }),
      ),
    ]);

    senderBalance.amount -= parsedValue;
    receiverBalance.amount += parsedValue;

    store.set(`${from}:${address}:balance`, senderBalance.save());
    store.set(`${to}:${address}:balance`, receiverBalance.save());
  };