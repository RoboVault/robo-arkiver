import { IManifest } from "@types";
import { Arkive } from "@types";
import { getRpcUrl } from "@utils";
import { logger } from "@deps";
import { DataSource } from "./data-source.ts";

export class Arkiver extends EventTarget {
  private readonly manifest: IManifest;
  private arkiveData: Arkive;
  private sources: DataSource[] = [];
  private packagePath: string;

  constructor(manifest: IManifest, arkiveData: Arkive, directory?: string) {
    super();
    this.manifest = manifest;
    this.arkiveData = arkiveData;
    this.packagePath = directory
      ? directory
      : `../packages/${this.arkiveData.user_id}/${this.arkiveData.id}/${this.arkiveData.deployment.major_version}_${this.arkiveData.deployment.minor_version}`;
  }

  public async run() {
    logger.info(
      `Running Arkiver for arkive ID number ${this.arkiveData.id}...`,
    );
    await this.initSources();
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
      });
      await dataSource.run();
      this.sources.push(dataSource);
    }
  }
}
