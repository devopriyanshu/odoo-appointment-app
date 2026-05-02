import axios from 'axios'
import FormData from 'form-data'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/ApiError'

const sarvamClient = axios.create({
  baseURL: env.SARVAM_API_BASE,
  headers: { 'api-subscription-key': env.SARVAM_API_KEY ?? '' },
  timeout: 30000,
})

export async function speechToText(audioBuffer: Buffer, languageCode = 'hi-IN'): Promise<string> {
  if (!env.SARVAM_API_KEY) throw new ApiError(503, 'AI service not configured')

  const form = new FormData()
  form.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' })
  form.append('language_code', languageCode)
  form.append('model', 'saarika:v2')

  try {
    const res = await sarvamClient.post('/speech-to-text', form, {
      headers: form.getHeaders(),
    })
    return res.data.transcript ?? ''
  } catch (err) {
    logger.error('Sarvam STT error', { err })
    throw new ApiError(503, 'Speech recognition unavailable')
  }
}

export function buildSystemPrompt(availableSlots: unknown[], languageHint?: string) {
  return `You are a helpful appointment booking assistant.
Today is ${new Date().toISOString()}.

Available slots from our database (ONLY suggest from these — never invent):
${JSON.stringify(availableSlots, null, 2)}

When a user wants to book:
1. Understand their preferred service, date, time, and provider
2. Match against the available slots provided above
3. Suggest the best match
4. Ask for confirmation before proceeding
5. When confirmed, respond with EXACTLY this JSON (no other text around it):
{"action":"BOOK","appointmentTypeId":"...","scheduledStart":"...","resourceId":"...","capacity":1}

Language: Respond in the same language the user writes in. ${languageHint ? `Prefer ${languageHint}.` : ''}
Keep responses concise and friendly.`
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export async function chatWithAI(
  message: string,
  sessionHistory: Message[],
  availableSlots: unknown[],
  languageCode?: string
) {
  if (!env.SARVAM_API_KEY) {
    return {
      responseText: "I'm sorry, the AI service is not configured. Please contact the administrator.",
      bookingAction: null,
    }
  }

  const systemPrompt = buildSystemPrompt(availableSlots, languageCode)
  const messages = [
    ...sessionHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ]

  try {
    const res = await sarvamClient.post('/v1/chat/completions', {
      model: 'sarvam-m',
      messages,
      system: systemPrompt,
    })

    const responseText: string = res.data.choices[0].message.content ?? ''
    const bookingAction = extractBookingAction(responseText)

    return { responseText, bookingAction }
  } catch (err) {
    logger.error('Sarvam Chat error', { err })
    return {
      responseText: "I'm having trouble connecting to the AI service. Please try again.",
      bookingAction: null,
    }
  }
}

function extractBookingAction(text: string): Record<string, unknown> | null {
  try {
    const match = text.match(/\{[^{}]*"action"\s*:\s*"BOOK"[^{}]*\}/)
    if (match) return JSON.parse(match[0])
  } catch {
    // ignore
  }
  return null
}

export async function textToSpeech(text: string, languageCode = 'hi-IN'): Promise<string> {
  if (!env.SARVAM_API_KEY) throw new ApiError(503, 'AI service not configured')

  try {
    const res = await sarvamClient.post('/text-to-speech', {
      inputs: [text.slice(0, 500)],
      target_language_code: languageCode,
      speaker: 'meera',
      model: 'bulbul:v1',
    })
    return res.data.audios?.[0] ?? ''
  } catch (err) {
    logger.error('Sarvam TTS error', { err })
    throw new ApiError(503, 'Text-to-speech unavailable')
  }
}
