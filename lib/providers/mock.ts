import { StatusProvider } from "./types.ts";

export const mockStatusProvider: StatusProvider = {
  getIndexedBlockHeight: async () => await 0,
};
