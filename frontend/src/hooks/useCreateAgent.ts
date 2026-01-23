import { useState, useCallback, useMemo } from 'react'
import { useSteps, useToast } from '@chakra-ui/react'
import { createAIAgent } from '@/utils/agent-creation'
import { useWallets } from '@privy-io/react-auth'

type AgentMetadata = {
  name: string
  template: string
  ensSubName: string
  creator?: string
  description: string
  model: string
  chain: string
}

export const useCreateAgent = () => {
  const { wallets } = useWallets()
  const toast = useToast()
  const { activeStep, setActiveStep, isCompleteStep } = useSteps({ index: 0 })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agent, setAgent] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  const embeddedWallet = useMemo(
    () => wallets.find(w => w.walletClientType !== 'privy'),
    [wallets],
  )

  const reset = useCallback(() => {
    setLoading(false)
    setSuccess(false)
    setProgress('')
    setAgent(null)
    setActiveStep(0)
  }, [setActiveStep])

  const validateStepOne = useCallback(() => {
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters long')
      return false
    }
    setNameError(null)
    return true
  }, [name])

  const handleCreateAgent = useCallback(async () => {
    if (!embeddedWallet?.address) {
      toast({
        status: 'error',
        title: 'Wallet not connected',
        position: 'top',
      })
      return
    }

    const metadata: AgentMetadata = {
      name: name.trim(),
      template: '',
      ensSubName: '',
      creator: embeddedWallet.address,
      description,
      model: 'gpt-3',
      chain: 'Sepolia',
    }

    try {
      setLoading(true)

      const provider = await embeddedWallet.getEthereumProvider()

      const result = await createAIAgent(
        metadata,
        embeddedWallet.address,
        provider,
        setProgress,
      )

      if (result?.agent) {
        setAgent(result.agent)
        setSuccess(true)
        isCompleteStep(2)
      }
    } catch (error: any) {
      toast({
        status: 'error',
        title: 'Agent creation failed',
        description: error?.message || progress || 'Unknown error',
        position: 'top',
        isClosable: true,
        duration: 8000,
      })
      reset()
    } finally {
      setLoading(false)
    }
  }, [
    embeddedWallet,
    name,
    description,
    progress,
    toast,
    isCompleteStep,
    reset,
  ])

  const handleSubmit = useCallback(async () => {
    switch (activeStep) {
      case 1:
        if (!validateStepOne()) return
        setActiveStep(2)
        await handleCreateAgent()
        break

      case 2:
        reset()
        break

      default:
        setActiveStep(prev => prev + 1)
    }
  }, [
    activeStep,
    setActiveStep,
    validateStepOne,
    handleCreateAgent,
    reset,
  ])

  return {
    name,
    setName,
    description,
    setDescription,
    agent,
    loading,
    success,
    nameError,
    activeStep,
    setActiveStep,
    handleSubmit,
    reset,
    progress,
  }
}
