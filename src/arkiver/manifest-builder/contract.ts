// deno-lint-ignore-file no-explicit-any
import {
  Abi,
  crypto,
  ExtractAbiEvent,
  ExtractAbiEventNames,
} from '../../deps.ts'
import {
  Contract,
  EventHandler,
  HexString,
  ValidateSourcesObject,
} from '../types.ts'
import { DataSourceBuilder } from './data-source.ts'

export class ContractBuilder<
  const TAbi extends Abi,
  TName extends string,
> {
  public contract: Contract

  constructor(
    private builder: DataSourceBuilder<TName>,
    abi: TAbi,
    name?: string,
  ) {
    const existing = this.builder.dataSource.contracts?.find(
      (contract) => contract.abi === abi,
    )
    if (existing !== undefined) {
      this.contract = existing
    } else {
      this.contract = {
        abi,
        sources: [],
        events: [],
        id: name ?? hashAbi(abi),
      }
      this.builder.dataSource.contracts!.push(this.contract)
    }
  }

  private addSource<TAddress extends string>(
    address: HexString<TAddress, 40> | '*',
    startBlockHeight: bigint,
  ) {
    if (address === '*' && this.contract.sources.length > 0) {
      throw new Error('Cannot add wildcard source after other sources.')
    }
    this.contract.sources.push({
      address: address,
      startBlockHeight,
    })
    return this
  }

  public addSources<TSources extends Record<string, bigint>>(
    sources: ValidateSourcesObject<TSources>,
  ) {
    if (typeof sources !== 'object') {
      throw new Error('Sources must be an object.')
    }
    if (
      (sources as Record<string, bigint>)['*'] !== undefined &&
      (Object.keys(sources).length > 1 || this.contract.sources.length > 0)
    ) {
      throw new Error('Cannot add wildcard source after other sources.')
    }

    for (const [address, startBlockHeight] of Object.entries(sources)) {
      this.addSource(address as any, startBlockHeight)
    }
    return this
  }

  private addEventHandler<
    TEventName extends ExtractAbiEventNames<TAbi>,
    TEventHandler extends EventHandler<
      ExtractAbiEvent<TAbi, TEventName>,
      TEventName,
      TAbi
    >,
  >(
    name: TEventName,
    handler: TEventHandler,
  ) {
    const existing = this.contract.events.find(
      (event) => event.name === name,
    )

    if (existing !== undefined) {
      throw new Error(`Cannot add event ${name} more than once.`)
    }

    this.contract.events.push({
      name,
      handler,
    })
    return this
  }

  public addEventHandlers(
    handlers: Partial<
      {
        [eventName in ExtractAbiEventNames<TAbi>]: EventHandler<
          ExtractAbiEvent<TAbi, eventName>,
          eventName,
          TAbi
        >
      }
    >,
  ) {
    if (typeof handlers !== 'object') {
      throw new Error('Event handlers must be an object.')
    }
    for (const [name, handler] of Object.entries(handlers)) {
      this.addEventHandler(name, handler as any)
    }
    return this
  }
}

const hashAbi = (abi: Abi) => {
  const textEncoder = new TextEncoder()
  const str = JSON.stringify(abi)
  const hash = crypto.subtle.digestSync('SHA-256', textEncoder.encode(str))
  const uint8Array = new Uint8Array(hash)
  const hexString = Array.from(
    uint8Array,
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
  return hexString
}
