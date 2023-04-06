import { log } from "./deps.ts";
log.setup({
	handlers: {
		console: new log.handlers.ConsoleHandler("DEBUG"),
	},
	loggers: {
		default: {
			level: "DEBUG",
			handlers: ["console"],
		},
	},
});

export const logger = log.getLogger();
