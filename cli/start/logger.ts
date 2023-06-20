import { ArkiveConsoleLogHandler, ArkiveManifest } from '../../mod.ts'
import { DataSource } from '../../src/arkiver/types.ts'
import { log } from '../deps.ts'

export const createManifestHandlers = (
  manifest: ArkiveManifest,
  logLevel: log.LevelName,
) => {
  let manifestHandlers: Record<string, ArkiveConsoleLogHandler> = {}
  let manifestLoggers: Record<string, log.LoggerConfig> = {}

  for (const [name, dataSource] of Object.entries(manifest.dataSources)) {
    const { handlers: contractHandlers, loggers: contractLoggers } =
      createContractHandlers({
        chain: name,
        dataSource,
        handlers: manifestHandlers,
        loggers: manifestLoggers,
        logLevel,
        manifest,
      })
    manifestHandlers = contractHandlers
    manifestLoggers = contractLoggers

    const { handlers: blockHandlers, loggers: blockLoggers } =
      createBlockHandlers({
        chain: name,
        dataSource,
        handlers: manifestHandlers,
        loggers: manifestLoggers,
        logLevel,
        manifest,
      })
    manifestHandlers = blockHandlers
    manifestLoggers = blockLoggers

    const { handlers: chainHandlers, loggers: chainLoggers } =
      createChainHandlers({
        chain: name,
        handlers: manifestHandlers,
        loggers: manifestLoggers,
        logLevel,
        manifest,
      })
    manifestHandlers = chainHandlers
    manifestLoggers = chainLoggers
  }

  return { loggers: manifestLoggers, handlers: manifestHandlers }
}

const createContractHandlers = (
  params: {
    manifest: ArkiveManifest
    logLevel: log.LevelName
    handlers: Record<string, ArkiveConsoleLogHandler>
    loggers: Record<string, log.LoggerConfig>
    chain: string
    dataSource: DataSource
  },
) => {
  const { chain, dataSource, handlers, loggers, logLevel, manifest } = params

  if (!dataSource.contracts) return { handlers, loggers }

  for (const contract of dataSource.contracts) {
    for (const event of contract.events) {
      const key = `${chain}-${contract.id}-${event.name}`
      handlers[key] = new ArkiveConsoleLogHandler(
        logLevel,
        {
          arkive: {
            name: manifest.name ?? 'my-arkive',
            id: 0,
            majorVersion: 1,
            minorVersion: 0,
          },
          contract: contract.id,
          chain,
          event: event.name,
        },
      )
      loggers[key] = {
        handlers: [key],
        level: logLevel,
      }
    }
  }

  return { handlers, loggers }
}

const createBlockHandlers = (
  params: {
    manifest: ArkiveManifest
    logLevel: log.LevelName
    handlers: Record<string, ArkiveConsoleLogHandler>
    loggers: Record<string, log.LoggerConfig>
    chain: string
    dataSource: DataSource
  },
) => {
  const { chain, dataSource, handlers, loggers, logLevel, manifest } = params

  if (!dataSource.blockHandlers) return { handlers, loggers }

  for (const blockHandler of dataSource.blockHandlers) {
    const key = `${chain}-${blockHandler.name}`
    handlers[key] = new ArkiveConsoleLogHandler(logLevel, {
      arkive: {
        name: manifest.name ?? 'my-arkive',
        id: 0,
        majorVersion: 1,
        minorVersion: 0,
      },
      chain,
      blockHandler: blockHandler.name,
    })
    loggers[key] = {
      handlers: [key],
      level: logLevel,
    }
  }

  return { handlers, loggers }
}

const createChainHandlers = (
  params: {
    manifest: ArkiveManifest
    logLevel: log.LevelName
    handlers: Record<string, ArkiveConsoleLogHandler>
    loggers: Record<string, log.LoggerConfig>
    chain: string
  },
) => {
  const { chain, handlers, loggers, logLevel, manifest } = params

  const key = `${chain}`
  handlers[key] = new ArkiveConsoleLogHandler(logLevel, {
    arkive: {
      name: manifest.name ?? 'my-arkive',
      id: 0,
      majorVersion: 1,
      minorVersion: 0,
    },
    chain,
  })
  loggers[key] = {
    handlers: [key],
    level: logLevel,
  }

  return { handlers, loggers }
}
