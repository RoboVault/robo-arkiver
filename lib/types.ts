export interface Arkive {
  id: number;
  version_number: number;
  status: string;
  owner_id: string;
  name: string;
}

export type ArkiveMessageEvent = NewArkiveMessageEvent | WorkerErrorEvent;

export interface NewArkiveMessageEvent {
  topic: "newArkives";
  data: {
    arkives: Arkive[];
  };
}

export interface WorkerErrorEvent {
  topic: "workerError";
  data: {
    error: Error;
    arkive: Arkive;
  };
}
