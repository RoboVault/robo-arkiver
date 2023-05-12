import { colors, ConsoleHandler, log } from './deps.ts'

type Arkive = {
	name: string
	majorVersion: number
	minorVersion: number
	id: number
}

export class ArkiveConsoleLogHandler extends ConsoleHandler {
	private arkive: Arkive
	private chain?: string
	private contract?: string
	private event?: string
	private blockHandler?: string

	constructor(
		levelName: log.LevelName,
		options: log.HandlerOptions & {
			arkive: Arkive
			chain?: string
			contract?: string
			event?: string
			blockHandler?: string
		},
	) {
		super(levelName, options)
		this.arkive = options.arkive
		this.chain = options.chain
		this.contract = options.contract
		this.event = options.event
		this.blockHandler = options.blockHandler
	}

	override format(logRecord: log.LogRecord): string {
		let msg = super.format(logRecord)

		let header =
			`${this.arkive.id}:${this.arkive.name}@v${this.arkive.majorVersion}.${this.arkive.minorVersion}${
				this.chain ? `:${this.chain}` : ''
			}`
		if (this.blockHandler) {
			header += `:${this.blockHandler}`
		} else if (this.contract && this.event) {
			header += `:${this.contract}:${this.event}`
		}

		msg = `${
			colors.blue(
				`[${header}]`,
			)
		} ${msg}`

		return msg
	}
}

export const logger = (loggerName: string) => log.getLogger(loggerName)
