import { Arkive, ArkiveManifest } from "../arkiver/types.ts";

export type ArkiveMessageEvent =
  | NewArkiveMessageEvent
  | WorkerErrorEvent
  | ArkiveSyncedEvent;

export interface NewArkiveMessageEvent {
  topic: "initArkive";
  data: {
    arkive: Arkive;
    manifest: ArkiveManifest;
  };
}

export interface WorkerErrorEvent {
  topic: "workerError";
  data: {
    error: Error;
    arkive: Arkive;
  };
}

export interface ArkiveSyncedEvent {
  topic: "synced";
  data: {
    arkive: Arkive;
  };
}
