import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import * as aiService from '../services/ai.service'
import * as bookingService from '../services/booking.service'
import { prisma } from '../config/database'
import { generateAvailableSlots } from '../services/slot.service'
import { addDays, format } from 'date-fns'

async function getUpcomingSlots() {
  const services = await prisma.appointmentType.findMany({
    where: { isPublished: true },
    select: { id: true, name: true },
  })

  const allSlots: unknown[] = []
  const today = new Date()

  for (const service of services.slice(0, 3)) {
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(today, i), 'yyyy-MM-dd')
      const { slots } = await generateAvailableSlots(service.id, date)
      if (slots.length > 0) {
        allSlots.push({
          serviceName: service.name,
          serviceId: service.id,
          date,
          slots: slots.slice(0, 3),
        })
      }
    }
  }

  return allSlots
}

async function getOrCreateSession(userId: string, sessionId?: string) {
  if (sessionId) {
    const session = await prisma.aIChatSession.findFirst({
      where: { id: sessionId, userId },
    })
    if (session && !session.isExpired) {
      const ageHours = (Date.now() - session.updatedAt.getTime()) / 3600000
      if (ageHours > 24) {
        await prisma.aIChatSession.update({ where: { id: sessionId }, data: { isExpired: true } })
      } else {
        return session
      }
    }
  }
  return prisma.aIChatSession.create({
    data: { userId, messages: [] },
  })
}

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { message, sessionId, languageCode } = req.body

  const session = await getOrCreateSession(req.user!.id, sessionId)
  const messages = (session.messages as Array<{ role: string; content: string; timestamp: string }>) ?? []

  messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() })

  const availableSlots = await getUpcomingSlots()
  const { responseText, bookingAction } = await aiService.chatWithAI(
    message,
    messages as any,
    availableSlots,
    languageCode
  )

  messages.push({ role: 'assistant', content: responseText, timestamp: new Date().toISOString() })
  await prisma.aIChatSession.update({ where: { id: session.id }, data: { messages } })

  res.json({ success: true, responseText, bookingAction, sessionId: session.id })
})

export const voice = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, languageCode } = req.body
  const audioBuffer = (req as any).file?.buffer

  if (!audioBuffer) {
    return res.status(400).json({ success: false, message: 'Audio file required' })
  }

  const transcript = await aiService.speechToText(audioBuffer, languageCode)

  const session = await getOrCreateSession(req.user!.id, sessionId)
  const messages = (session.messages as Array<{ role: string; content: string; timestamp: string }>) ?? []
  messages.push({ role: 'user', content: transcript, timestamp: new Date().toISOString() })

  const availableSlots = await getUpcomingSlots()
  const { responseText, bookingAction } = await aiService.chatWithAI(
    transcript,
    messages as any,
    availableSlots,
    languageCode
  )

  messages.push({ role: 'assistant', content: responseText, timestamp: new Date().toISOString() })
  await prisma.aIChatSession.update({ where: { id: session.id }, data: { messages } })

  let audioBase64: string | undefined
  try {
    audioBase64 = await aiService.textToSpeech(responseText, languageCode ?? 'hi-IN')
  } catch {
    // TTS optional
  }

  res.json({ success: true, transcript, responseText, bookingAction, audioBase64, sessionId: session.id })
})

export const confirmAIBooking = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentTypeId, resourceId, scheduledStart, capacity, sessionId } = req.body

  const booking = await bookingService.createBooking(
    { appointmentTypeId, resourceId, scheduledStart, capacity: capacity ?? 1, answers: [] },
    req.user!.id
  )

  await prisma.bookingAuditLog.create({
    data: { bookingId: booking.id, actorId: req.user!.id, action: 'AI_BOOKED', metadata: { sessionId } },
  })

  res.status(201).json({ success: true, booking })
})
