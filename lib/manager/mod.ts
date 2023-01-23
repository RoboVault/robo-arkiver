import { SupabaseClient, RealtimeChannel } from "../../deps.ts";
import { Arkive, ArkiveMessageEvent } from "../types.ts";
import { getSupabaseClient, rm, unpack } from "../utils.ts";
import { logError } from "../utils.ts";

export class ArkiveManager {
  private indexerWorker: Worker;
  private supabase: SupabaseClient;
  private newArkiveListener?: RealtimeChannel;

  constructor() {
    this.sendArkives = this.sendArkives.bind(this);
    this.pullPackages = this.pullPackages.bind(this);
    this.removePackage = this.removePackage.bind(this);
    this.indexerWorker = new Worker(
      new URL("../worker/mod.ts", import.meta.url),
      {
        type: "module",
        deno: {
          permissions: {
            env: [
              "INFLUXDB_URL",
              "INFLUXDB_TOKEN",
              "INFLUXDB_ORG",
              "INFLUXDB_BUCKET",
              "NODE_ENV",
            ],
            hrtime: false,
            net: true,
            ffi: false,
            read: true,
            run: false,
            sys: false,
            write: false,
          },
        },
      }
    );
    this.indexerWorker.onmessage = async (
      e: MessageEvent<ArkiveMessageEvent>
    ) => {
      if (e.data.topic === "workerError") {
        logError(e.data.data.error, {
          source: "worker-arkive-" + e.data.data.arkive.id,
        });
      } else if (e.data.topic === "synced") {
        try {
          await this.removePackage(e.data.data.arkive);
          await this.updateArkiveStatus(e.data.data.arkive, "retired");
        } catch (error) {
          logError(error, {
            source: "worker-arkive-synced-" + e.data.data.arkive.id,
          });
        }
      }
    };
    this.supabase = getSupabaseClient();
  }

  public async init() {
    //  a1. Get all arkives from supabase
    const arkives = await this.getArkives();
    //  b1. Subscribe to new inserts and deletes in arkive table
    this.listenForNewArkives();
    //  a2. Aggregate arkives by owner and name and get the latest version
    const aggregatedArkives = this.aggregateArkives(arkives);
    //  a3. Pull each arkive package from supabase storage
    await this.pullPackages(aggregatedArkives);
    //  a4. Send aggregated arkives to indexer worker
    this.sendArkives(aggregatedArkives);
  }

  private async getArkives() {
    const arkivesRes = await this.supabase
      .from("arkive")
      .select<"*", Arkive>("*");

    if (arkivesRes.error) {
      throw arkivesRes.error;
    }

    return arkivesRes.data;
  }

  private listenForNewArkives() {
    const listener = this.supabase
      .channel("arkive-changes")
      .on<Arkive>(
        "postgres_changes",
        { event: "INSERT", schema: "public" },
        async (payload) => {
          await this.pullPackages([payload.new]);
          this.sendArkives([payload.new]);
        }
      )
      .subscribe();

    this.newArkiveListener = listener;
  }

  private sendArkives(arkives: Arkive[]) {
    this.indexerWorker.postMessage({ topic: "newArkives", data: { arkives } });
  }

  private aggregateArkives(arkives: Arkive[]) {
    const aggregatedMap = new Map<string, Arkive>();
    for (const arkive of arkives) {
      const key = `${arkive.owner_id}/${arkive.name}`;
      const existingArkive = aggregatedMap.get(key);
      if (
        !existingArkive ||
        existingArkive.version_number < arkive.version_number
      ) {
        aggregatedMap.set(key, arkive);
      }
    }
    return [...aggregatedMap.values()];
  }

  private async pullPackages(arkives: Arkive[]) {
    const promises = arkives.map(async (arkive) => {
      const path = `${arkive.owner_id}/${arkive.name}`;
      console.log(`Pulling ${path}...`);

      const { data, error } = await this.supabase.storage
        .from("packages")
        .download(`${path}/${arkive.version_number}.tar.gz`);
      if (error) {
        throw error;
      }

      const localDir = new URL(
        `../packages/${path}/${arkive.version_number}`,
        import.meta.url
      );
      const localPath = new URL(
        `../packages/${path}/${arkive.version_number}.tar.gz`,
        import.meta.url
      );

      await Deno.mkdir(localDir, { recursive: true });
      await Deno.writeFile(localPath, new Uint8Array(await data.arrayBuffer()));
      await unpack(localPath.pathname, localDir.pathname);
      await rm(localPath.pathname);
    });
    await Promise.all(promises);
  }

  private async removePackage(arkive: Arkive) {
    const path = `${arkive.owner_id}/${arkive.name}`;
    const localDir = new URL(
      `../packages/${path}/${arkive.version_number}`,
      import.meta.url
    );
    await rm(localDir.pathname, { recursive: true });
  }

  private async updateArkiveStatus(arkive: Arkive, status: string) {
    const { error } = await this.supabase
      .from("arkive")
      .update({ status })
      .eq("id", arkive.id);
    if (error) {
      throw error;
    }
  }

  public cleanup() {
    this.indexerWorker.terminate();
    this.newArkiveListener?.unsubscribe();
  }
}
