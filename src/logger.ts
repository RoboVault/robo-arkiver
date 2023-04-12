import { colors, ConsoleHandler, log } from './deps.ts'

type Arkive = {
	name: string
	majorVersion: number
	minorVersion: number
	id: number
}

export class ArkiveConsoleLogHandler extends ConsoleHandler {
	private arkive: Arkive

	constructor(
		levelName: log.LevelName,
		options: log.HandlerOptions & {
			arkive: Arkive
		},
	) {
		super(levelName, options)
		this.arkive = options.arkive
	}

	override format(logRecord: log.LogRecord): string {
		let msg = super.format(logRecord)

		msg = `${
			colors.blue(
				`[${this.arkive.id}:${this.arkive.name}@v${this.arkive.majorVersion}.${this.arkive.minorVersion}]`,
			)
		} ${msg}`

		return msg
	}
}

export const logger = () => log.getLogger('arkiver')
