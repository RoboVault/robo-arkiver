import { colors, ConsoleHandler, log } from "./deps.ts";

export class ArkiveConsoleLogHandler extends ConsoleHandler {
  private arkiveName: string;
  private arkiveId: number;
  private arkiveVersion: number;

  constructor(
    levelName: log.LevelName,
    options: log.HandlerOptions & {
      arkiveName: string;
      arkiveId: number;
      arkiveVersion: number;
    },
  ) {
    super(levelName, options);
    this.arkiveName = options.arkiveName;
    this.arkiveId = options.arkiveId;
    this.arkiveVersion = options.arkiveVersion;
  }

  override format(logRecord: log.LogRecord): string {
    let msg = super.format(logRecord);

    msg = `${
      colors.blue(
        `[${this.arkiveId}-${this.arkiveName}@v${this.arkiveVersion}]`,
      )
    } ${msg}`;

    return msg;
  }
}

export const logger = () => log.getLogger("arkiver");
