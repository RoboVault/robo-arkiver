import { formatUnits, getContract } from 'npm:viem'
import { type BlockHandler } from 'https://deno.land/x/robo_arkiver@v0.4.15/mod.ts'
import { VaultSnapshot } from '../entities/vault.ts'
import { YearnV2Abi } from '../abis/YearnV2.ts'

const VAULTS = [
  { address: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95', block: 12796965 }, // yvDAI
  { address: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE', block: 13513457 }, // yvUSDC
] as const

export const snapshotVault: BlockHandler = async ({
  block,
  client,
  store,
}): Promise<void> => {
  // Filter out vaults that haven't been deployed yet
  const liveVaults = VAULTS.filter((e) => e.block < Number(block.number))

  // Get vault info from cache or onchain
  const vaults = await Promise.all(liveVaults.map(async (vault) => {
    const contract = getContract({
      address: vault.address,
      abi: YearnV2Abi,
      publicClient: client,
    })
    return {
      address: vault.address,
      vault: { address: vault.address, abi: YearnV2Abi } as const,
      contract,
      name: await store.retrieve(
        `${vault.address}:name`,
        async () => await contract.read.name(),
      ),
      symbol: await store.retrieve(
        `${vault.address}:symbol`,
        async () => await contract.read.symbol(),
      ),
      decimals: await store.retrieve(
        `${vault.address}:decimals`,
        async () => await contract.read.decimals(),
      ),
    }
  }))

  // fetch share price for this block
  const sharePrices = await Promise.all(vaults.map((e) => {
    return client.readContract({
      address: e.address,
      abi: YearnV2Abi,
      functionName: 'pricePerShare',
      blockNumber: block.number,
    })
  }))

  // Save the vault snapshots
  vaults.map((vault, i) => {
    return new VaultSnapshot({
      id: `${vault.address}-${Number(block.number)}`,
      block: Number(block.number),
      timestamp: Number(block.timestamp),
      vault: vault.address,
      sharePrice: parseFloat(
        formatUnits(sharePrices[i], Number(vault.decimals)),
      ),
      name: vault.name,
      symbol: vault.symbol,
    })
  }).map((e) => e.save())
}
