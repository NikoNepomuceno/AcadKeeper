import { useState, useCallback, useEffect } from 'react'

interface RateLimitState {
  failedAttempts: number
  isBlocked: boolean
  timeRemaining: number
  blockDuration: number
}

const INITIAL_STATE: RateLimitState = {
  failedAttempts: 0,
  isBlocked: false,
  timeRemaining: 0,
  blockDuration: 0
}

export function useRateLimit() {
  const [state, setState] = useState<RateLimitState>(INITIAL_STATE)

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('rate-limit-state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        const now = Date.now()
        
        // Check if block period has expired
        if (parsed.isBlocked && parsed.blockExpiry && now >= parsed.blockExpiry) {
          // Reset state if block has expired
          setState(INITIAL_STATE)
          localStorage.removeItem('rate-limit-state')
        } else if (parsed.isBlocked && parsed.blockExpiry) {
          // Still blocked, calculate remaining time
          const remaining = Math.ceil((parsed.blockExpiry - now) / 1000)
          setState({
            failedAttempts: parsed.failedAttempts,
            isBlocked: true,
            timeRemaining: remaining,
            blockDuration: parsed.blockDuration
          })
        } else {
          setState(parsed)
        }
      } catch (error) {
        console.error('Error parsing rate limit state:', error)
        setState(INITIAL_STATE)
      }
    }
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!state.isBlocked || state.timeRemaining <= 0) return

    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          // Block period expired
          const newState = { ...INITIAL_STATE, failedAttempts: 0 }
          localStorage.removeItem('rate-limit-state')
          return newState
        }
        
        const newState = {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }
        
        // Update localStorage
        const blockExpiry = Date.now() + (newState.timeRemaining * 1000)
        localStorage.setItem('rate-limit-state', JSON.stringify({
          ...newState,
          blockExpiry
        }))
        
        return newState
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [state.isBlocked, state.timeRemaining])

  const recordFailedAttempt = useCallback(() => {
    setState(prev => {
      const newFailedAttempts = prev.failedAttempts + 1
      let newBlockDuration = 0
      let shouldBlock = false

      // Determine block duration based on failed attempts
      if (newFailedAttempts >= 5) {
        if (newFailedAttempts === 5) {
          // First time hitting 5 attempts: 15 seconds
          newBlockDuration = 15
          shouldBlock = true
        } else if (newFailedAttempts > 5) {
          // After 5 attempts, each new failure increases to 30 seconds
          newBlockDuration = 30
          shouldBlock = true
        }
      }

      const newState: RateLimitState = {
        failedAttempts: newFailedAttempts,
        isBlocked: shouldBlock,
        timeRemaining: shouldBlock ? newBlockDuration : 0,
        blockDuration: newBlockDuration
      }

      // Save to localStorage
      if (shouldBlock) {
        const blockExpiry = Date.now() + (newBlockDuration * 1000)
        localStorage.setItem('rate-limit-state', JSON.stringify({
          ...newState,
          blockExpiry
        }))
      } else {
        localStorage.setItem('rate-limit-state', JSON.stringify(newState))
      }

      return newState
    })
  }, [])

  const resetRateLimit = useCallback(() => {
    setState(INITIAL_STATE)
    localStorage.removeItem('rate-limit-state')
  }, [])

  const canAttempt = useCallback(() => {
    return !state.isBlocked
  }, [state.isBlocked])

  return {
    failedAttempts: state.failedAttempts,
    isBlocked: state.isBlocked,
    timeRemaining: state.timeRemaining,
    blockDuration: state.blockDuration,
    recordFailedAttempt,
    resetRateLimit,
    canAttempt
  }
}
