import { NFTDeployed as NFTDeployedEvent } from "../generated/NFTFactory/NFTFactory"
import { NFTDeployed } from "../generated/schema"

export function handleNFTDeployed(event: NFTDeployedEvent): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let entity = NFTDeployed.load(id)

  if (entity == null) {
    entity = new NFTDeployed(id)
  }

  entity.nftAddress = event.params.nftAddress
  entity.owner = event.params.owner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
