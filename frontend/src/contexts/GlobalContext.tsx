import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import {
  BiconomySmartAccountV2,
  createSmartAccountClient,
  LightSigner,
} from '@biconomy/account'
import { sepolia } from 'viem/chains'
import { useQuery } from '@apollo/client'
import client from '@/utils/apollo-client'
import { GET_NFT_DEPLOYED } from '@/utils/queries'
import {
  callReadContract,
  fetchContent,
  getDetailsFromNFTContract,
} from '@/utils/helpers'
import { useDisclosure } from '@chakra-ui/react'
import AgentFactory from '@/contracts/abi/AgentFactory.json'
import AgentTemplate from '@/contracts/abi/Agent.json'

interface GlobalContextType {
  isCollapsed: boolean
  setIsCollapsed: (v: boolean) => void
  index: number
  setIndex: (v: number) => void
  nftData: any[] | null
  agents: any[] | null
  setNftData: (v: any[] | null) => void
  loadingMarket: boolean
  smartAccountClient: () => Promise<BiconomySmartAccountV2 | undefined>
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [index, setIndex] = useState(0)
  const [nftData, setNftData] = useState<any[] | null>(null)
  const [agents, setAgents] = useState<any[] | null>(null)

  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.walletClientType !== 'privy'),
    [wallets]
  )

  const { loading: loadingMarket, data } = useQuery(GET_NFT_DEPLOYED, {
    variables: { first: 5 },
    client,
  })

  /* ================= NFT FETCH ================= */

  useEffect(() => {
    if (!data?.nftdeployeds) return

    const fetchNFTDetails = async () => {
      const detailed = await Promise.all(
        data.nftdeployeds.map(async (nft: any) => {
          const details = await getDetailsFromNFTContract(nft.nftAddress)
          if (!details) return null

          if (details.cid) {
            const metadata = await fetchContent(details.cid)
            return { ...nft, ...details, metadata }
          }

          return { ...nft, ...details }
        })
      )

      setNftData(detailed.filter(Boolean))
    }

    fetchNFTDetails()
  }, [data])

  /* ================= AGENT FETCH ================= */

  useEffect(() => {
    if (!embeddedWallet) return

    const fetchAgents = async () => {
      try {
        const factoryAddress = process.env
          .NEXT_PUBLIC_AGENTFACTORY_ADDRESS as `0x${string}`

        const agentsRaw = await callReadContract(
          factoryAddress,
          'getAgentsByCreator',
          AgentFactory.abi,
          [embeddedWallet.address as `0x${string}`]
        )

        if (!agentsRaw) return

        const resolved = await Promise.all(
          agentsRaw.map(async (agent: any) => {
            const info = await callReadContract(
              agent.agentAddress,
              'getIndexInfo',
              AgentTemplate.abi,
              []
            )

            if (!info) return null

            const metadata = await fetchContent(agent.cid)

            return {
              ...agent,
              metadata: metadata ?? null,
              count: Number(info[2]),
              version: Number(info[1]),
            }
          })
        )

        setAgents(resolved.filter(Boolean))
      } catch (err) {
        console.error('Error fetching agents:', err)
      }
    }

    fetchAgents()
  }, [embeddedWallet])

  /* ================= WALLET ================= */

  const walletClient = useCallback(async () => {
    if (!embeddedWallet) return

    await embeddedWallet.switchChain(sepolia.id)
    return await embeddedWallet.getEthersProvider()
  }, [embeddedWallet])

  const smartAccountClient = useCallback(async () => {
    if (!authenticated) return

    const provider = await walletClient()
    if (!provider) return

    return createSmartAccountClient({
      signer: provider.getSigner() as LightSigner,
      chainId: sepolia.id,
      bundlerUrl: `https://bundler.biconomy.io/api/v2/${sepolia.id}/${
        process.env.NEXT_PUBLIC_BUNDLER_ID as string
      }`,
      biconomyPaymasterApiKey: process.env.NEXT_PUBLIC_PAYMASTER_KEY,
      rpcUrl: 'https://rpc.sepolia.org',
    })
  }, [authenticated, walletClient])

  /* ================= MEMO CONTEXT ================= */

  const value = useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      index,
      setIndex,
      nftData,
      setNftData,
      loadingMarket,
      smartAccountClient,
      isOpen,
      onOpen,
      onClose,
      agents,
    }),
    [
      isCollapsed,
      index,
      nftData,
      loadingMarket,
      smartAccountClient,
      isOpen,
      onOpen,
      onClose,
      agents,
    ]
  )

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalContext = () => {
  const ctx = useContext(GlobalContext)
  if (!ctx) {
    throw new Error('useGlobalContext must be used within GlobalProvider')
  }
  return ctx
}
