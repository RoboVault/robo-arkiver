import { StatusProvider } from "./types.ts";

export const mockStatusProvider: StatusProvider = {
  getIndexedBlockHeight: () => Promise.resolve(0),
};
