import { Button } from '@chakra-ui/react'

interface CreateAgentFooterProps {
  isLoading: boolean
  isSuccess: boolean
  handleSubmit: () => void
}

export default function CreateAgentFooter({
  isLoading,
  isSuccess,
  handleSubmit,
}: CreateAgentFooterProps) {
  if (isLoading || isSuccess) return null

  const gradientStyles = {
    bgGradient: 'linear(to-r, #c5ff49, #04b670)',
    color: 'white',
    border: 'none',
  }

  return (
    <Button
      {...gradientStyles}
      _hover={gradientStyles}
      _active={gradientStyles}
      w="220px"
      h="60px"
      mr={3}
      onClick={handleSubmit}
    >
      Continue
    </Button>
  )
}
