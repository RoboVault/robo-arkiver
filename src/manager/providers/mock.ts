import { StatusProvider } from "./interfaces.ts";

export const mockStatusProvider: StatusProvider = {
  getIndexedBlockHeight: () => Promise.resolve(0),
};
