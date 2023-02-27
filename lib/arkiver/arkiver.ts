import { IManifest } from "@types";
import { Arkive } from "@types";
import { getEnv, getRpcUrl } from "@utils";
import { InfluxDB, logger } from "@deps";
import { DataSource } from "./data-source.ts";

export class Arkiver extends EventTarget {
  private readonly manifest: IManifest;
  private arkiveData: Arkive;
  private sources: DataSource[] = [];
  private packagePath: string;

  private readonly db: InfluxDB;

  constructor(manifest: IManifest, arkiveData: Arkive, directory?: string) {
    super();
    this.manifest = manifest;
    this.arkiveData = arkiveData;
    this.packagePath = directory
      ? directory
      : `../packages/${this.arkiveData.user_id}/${this.arkiveData.id}/${this.arkiveData.deployment.major_version}_${this.arkiveData.deployment.minor_version}`;
    this.db = new InfluxDB({
      url: getEnv("INFLUXDB_URL"),
      token: getEnv("INFLUXDB_TOKEN"),
    });
  }

  public async run() {
    logger.info(
      `Running Arkiver for arkive ID number ${this.arkiveData.id}...`,
    );
    try {
      await this.initSources();
    } catch (e) {
      logger.error(`Error running arkiver: ${e}`);
    }
  }

  private async initSources() {
    logger.info(`Initializing data sources...`);
    const { dataSources } = this.manifest;
    for (const [chain, source] of Object.entries(dataSources)) {
      const dataSource = new DataSource({
        arkiveId: this.arkiveData.id,
        arkiveVersion: this.arkiveData.deployment.major_version,
        blockRange: 3000,
        chain,
        contracts: source.contracts ?? [],
        packagePath: this.packagePath,
        rpcUrl: getRpcUrl(chain),
        blockSources: source.blockHandlers ?? [],
        db: {
          writer: this.db.getWriteApi(
            getEnv("INFLUXDB_ORG"),
            getEnv("INFLUXDB_BUCKET"),
            "s",
          ),
          reader: this.db.getQueryApi(getEnv("INFLUXDB_ORG")),
        },
      });
      await dataSource.run();
      this.sources.push(dataSource);
    }
  }
}
