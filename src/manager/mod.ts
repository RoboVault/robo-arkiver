import { SupabaseProvider } from "./providers/supabase.ts";
import { ArkiveProvider } from "./providers/interfaces.ts";
import { Arkive, Deployment } from "../arkiver/types.ts";
import { ArkiveMessageEvent } from "../manager/types.ts";
import { getEnv, rm } from "../utils.ts";
import { DeleteAPI, InfluxDB } from "../deps.ts";
import { logger } from "../logger.ts";

export class ArkiveManager {
  private arkiveProvider: ArkiveProvider;
  private arkives: { arkive: Arkive; worker: Worker }[] = [];
  private readonly deleteApi: DeleteAPI;

  constructor() {
    this.removeAllArkives = this.removeAllArkives.bind(this);
    this.addNewArkive = this.addNewArkive.bind(this);

    this.arkiveProvider = new SupabaseProvider();

    const db = new InfluxDB({
      url: getEnv("INFLUXDB_URL"),
      token: getEnv("INFLUXDB_TOKEN"),
    });
    this.deleteApi = new DeleteAPI(db);
  }

  public async init() {
    try {
      //  a1. Get all arkives from supabase
      const arkives = await this.getArkives();
      //  b1. Subscribe to new inserts and deletes in arkive table
      this.listenNewArkives();
      this.listenForDeletedArkives();
      //  a2. Aggregate arkives by owner and name and get the latest version
      // const aggregatedArkives = this.aggregateArkives(arkives);
      await Promise.all(
        arkives.map(async (arkive) => {
          await this.addNewArkive(arkive);
        }),
      );
    } catch (e) {
      logger.error(e, { source: "ArkiveManager.init" });
    }
  }

  private async getArkives() {
    logger.info("fetching existing arkives");
    return await this.arkiveProvider.getArkives();
  }

  private listenNewArkives() {
    this.arkiveProvider.listenNewArkive(async (arkive: Arkive) => {
      logger.info("new arkive", arkive);
      // only remove previous versions if on the same major version.
      // new major versions will be removed once the new version is synced
      const previousArkives = this.getPreviousVersions(arkive);
      const sameMajor = previousArkives.filter(
        (a) =>
          a.arkive.deployment.major_version === arkive.deployment.major_version,
      );
      this.arkives = this.arkives.filter(
        (a) =>
          a.arkive.deployment.major_version !== arkive.deployment.major_version,
      );

      await Promise.all(sameMajor.map(async (arkive) => {
        await this.removeArkive(arkive);
      }));

      await this.addNewArkive(arkive);
    });
    logger.info("listening for new arkives");
  }

  private listenForDeletedArkives() {
    this.arkiveProvider.listenDeletedArkive(async ({ id }) => {
      logger.info("deleting arkives", id);
      await this.removeAllArkives(id);
      logger.info("deleted arkives", id);
    });
    logger.info("listening for deleted arkives");
  }

  private async addNewArkive(arkive: Arkive) {
    logger.info("adding new arkive", arkive);
    await this.pullPackage(arkive);
    const worker = await this.spawnArkiverWorker(arkive);
    await this.updateDeploymentStatus(arkive, "syncing");
    this.arkives = [...this.arkives, { arkive, worker }];
    logger.info("added new arkive", arkive);
  }

  // this is called when an arkive is deleted by the user which means the record is no longer in the tables
  private async removeAllArkives(id: number) {
    logger.info("removing arkives", id);
    const deletedArkives = this.arkives.filter((a) => a.arkive.id === id);
    await Promise.all(deletedArkives.map(async (arkive) => {
      await this.removePackage(arkive.arkive);
      arkive.worker.terminate();
    }));
    this.arkives = this.arkives.filter((a) => a.arkive.id !== id);
    logger.info("removed arkives", id);
  }

  // this is called in two places: when a new minor version is added (listenNewArkives)
  // and when a new major version has fully synced (worker.onmessage)
  private async removeArkive(arkive: { arkive: Arkive; worker: Worker }) {
    logger.info("removing arkive", arkive);
    await this.removePackage(arkive.arkive);
    await this.updateDeploymentStatus(
      arkive.arkive,
      "retired",
    );
    arkive.worker.terminate();
  }

  private removeIndexedData(arkive: Arkive) {
    const start = new Date(0);
    const stop = new Date();

    this.deleteApi.postDelete({
      org: getEnv("INFLUXDB_ORG"),
      bucket: getEnv("INFLUXDB_BUCKET"),
      body: {
        start: start.toISOString(),
        stop: stop.toISOString(),
        predicate: `arkiveId="${arkive.id}"`,
      },
    });
  }

  private async spawnArkiverWorker(arkive: Arkive) {
    const manifestPath =
      `../packages/${arkive.user_id}/${arkive.id}/${arkive.deployment.major_version}_${arkive.deployment.minor_version}/manifest.ts`;
    const { manifest } = await import(manifestPath);

    const worker = new Worker(
      new URL("../arkiver/worker.ts", import.meta.url),
      {
        type: "module",
        deno: {
          permissions: {
            env: [
              "INFLUXDB_URL",
              "INFLUXDB_TOKEN",
              "INFLUXDB_ORG",
              "INFLUXDB_BUCKET",
              "DENO_ENV",
              "NODE_ENV",
              "AVALANCHE_RPC_URL",
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
      },
    );

    worker.onmessage = async (e: MessageEvent<ArkiveMessageEvent>) => {
      if (e.data.topic === "workerError") {
        logger.error(e.data.data.error, {
          source: "worker-arkive-" + e.data.data.arkive.id,
        });
      } else if (e.data.topic === "synced") {
        try {
          const previousVersions = this.getPreviousVersions(e.data.data.arkive);
          for (const previousVersion of previousVersions) {
            // check if previous version is an older major version
            if (
              previousVersion.arkive.deployment.major_version <
                arkive.deployment.major_version
            ) {
              logger.info("removing old major version", previousVersion.arkive);
              await this.removeArkive(previousVersion);
              this.removeIndexedData(previousVersion.arkive);
              logger.info("removed old major version", previousVersion.arkive);
            }
          }
          await this.updateDeploymentStatus(
            e.data.data.arkive,
            "synced",
          );
        } catch (error) {
          logger.error(error, {
            source: "worker-arkive-synced-" + e.data.data.arkive.id,
          });
        }
      }
    };
    worker.onerror = (e) => {
      logger.error(e.error, {
        source: "worker-arkive-" + arkive.id,
      });
    };
    worker.postMessage({
      topic: "initArkive",
      data: {
        arkive,
        manifest,
      },
    });
    return worker;
  }

  private async pullPackage(arkive: Arkive) {
    await this.arkiveProvider.pullArkive(arkive);
  }

  private getPreviousVersions(arkive: Arkive) {
    return this.arkives.filter(
      (a) =>
        a.arkive.id === arkive.id && // same id
        (a.arkive.deployment.major_version < arkive.deployment.major_version || // older major version
          (a.arkive.deployment.major_version === // same major version but older minor version
              arkive.deployment.major_version &&
            a.arkive.deployment.minor_version <
              arkive.deployment.minor_version)),
    );
  }

  private async removePackage(arkive: Arkive) {
    const path = `${arkive.user_id}/${arkive.id}`;
    const localDir = new URL(
      `../packages/${path}/${arkive.deployment.major_version}_${arkive.deployment.minor_version}`,
      import.meta.url,
    );
    logger.info("removing package", localDir.pathname);
    await rm(localDir.pathname, { recursive: true });
  }

  private async updateDeploymentStatus(
    arkive: Arkive,
    status: Deployment["status"],
  ) {
    await this.arkiveProvider.updateDeploymentStatus(arkive, status);
  }

  public cleanup() {
    this.arkives.forEach((arkive) => arkive.worker.terminate());
    this.arkiveProvider.close();
  }
}
