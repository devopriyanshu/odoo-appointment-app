'use client'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import api from '../lib/api'
import type { ChatMessage, BookingAction } from '../types'

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [languageCode, setLanguageCode] = useState('en-IN')

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date().toISOString() }])
  }

  const sendMessage = useCallback(
    async (text: string): Promise<BookingAction | null> => {
      addMessage('user', text)
      setIsLoading(true)
      try {
        const res = await api.post('/ai/chat', {
          message: text,
          sessionId,
          languageCode,
        })
        const { responseText, bookingAction, sessionId: newSessionId } = res.data
        setSessionId(newSessionId)
        addMessage('assistant', responseText)
        return bookingAction
      } catch {
        addMessage('assistant', "Sorry, I couldn't connect to the AI service right now.")
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, languageCode]
  )

  const sendVoice = useCallback(
    async (blob: Blob): Promise<{ bookingAction: BookingAction | null; audioBase64?: string }> => {
      setIsLoading(true)
      try {
        const formData = new FormData()
        formData.append('audio', blob, 'audio.webm')
        if (sessionId) formData.append('sessionId', sessionId)
        formData.append('languageCode', languageCode)

        const res = await api.post('/ai/voice', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const { transcript, responseText, bookingAction, audioBase64, sessionId: newSessionId } = res.data
        setSessionId(newSessionId)
        addMessage('user', transcript)
        addMessage('assistant', responseText)

        if (audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
          audio.play().catch(() => {})
        }

        return { bookingAction, audioBase64 }
      } catch {
        addMessage('assistant', "Voice processing failed. Please try typing instead.")
        return { bookingAction: null }
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, languageCode]
  )

  const confirmBooking = useCallback(
    async (action: BookingAction) => {
      setIsLoading(true)
      try {
        const res = await api.post('/ai/confirm-booking', {
          ...action,
          sessionId,
        })
        const booking = res.data.booking
        addMessage(
          'assistant',
          `✅ Booking confirmed! Your confirmation code is **${booking.confirmationCode}**. See you on ${new Date(action.scheduledStart).toLocaleDateString()}!`
        )
        toast.success('Booking confirmed via AI assistant!')
        return booking
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Booking failed'
        addMessage('assistant', `Sorry, I couldn't complete the booking: ${msg}`)
        toast.error(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId]
  )

  const clearSession = useCallback(() => {
    setMessages([])
    setSessionId(null)
  }, [])

  return {
    messages,
    sessionId,
    isLoading,
    languageCode,
    setLanguageCode,
    sendMessage,
    sendVoice,
    confirmBooking,
    clearSession,
  }
}
