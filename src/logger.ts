import { colors, ConsoleHandler, log } from './deps.ts'

export class ArkiveConsoleLogHandler extends ConsoleHandler {
	private arkiveName: string

	constructor(
		levelName: log.LevelName,
		options: log.HandlerOptions & { arkiveName: string },
	) {
		super(levelName, options)
		this.arkiveName = options.arkiveName
	}

	override format(logRecord: log.LogRecord): string {
		let msg = super.format(logRecord)

		msg = `${colors.blue(`[${this.arkiveName}]`)} ${msg}`

		return msg
	}
}

export const logger = () => log.getLogger('arkiver')
