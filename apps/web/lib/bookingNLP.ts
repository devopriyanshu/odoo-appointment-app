import { addDays, format, startOfDay } from 'date-fns'
import type { AppointmentType } from '../types'

export interface ExtractedIntent {
  serviceId?: string
  serviceName?: string
  date?: string // YYYY-MM-DD
  time?: string // HH:MM (24h)
  capacity?: number
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function extractDate(text: string): string | undefined {
  const lower = text.toLowerCase()
  const today = startOfDay(new Date())

  if (/\btoday\b/.test(lower)) return format(today, 'yyyy-MM-dd')
  if (/\btomorrow\b/.test(lower) || /\btmrw\b/.test(lower)) return format(addDays(today, 1), 'yyyy-MM-dd')
  if (/\bday after tomorrow\b/.test(lower)) return format(addDays(today, 2), 'yyyy-MM-dd')

  // "next monday", "this friday", "monday"
  for (let i = 0; i < 7; i++) {
    const day = WEEKDAYS[i]
    const re = new RegExp(`\\b(?:next |this |coming )?${day}\\b`)
    if (re.test(lower)) {
      const todayDow = today.getDay()
      let diff = i - todayDow
      if (diff <= 0) diff += 7
      return format(addDays(today, diff), 'yyyy-MM-dd')
    }
  }

  // ISO date
  const iso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return iso[1]

  // DD/MM or DD-MM (assume current year)
  const dmy = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/)
  if (dmy) {
    const day = parseInt(dmy[1], 10)
    const month = parseInt(dmy[2], 10)
    let year = dmy[3] ? parseInt(dmy[3], 10) : today.getFullYear()
    if (year < 100) year += 2000
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return undefined
}

function extractTime(text: string): string | undefined {
  const lower = text.toLowerCase()

  // "10am", "10 am", "10:30am", "10:30 pm", "14:00"
  const m = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (m) {
    let hour = parseInt(m[1], 10)
    const minute = m[2] ? parseInt(m[2], 10) : 0
    const meridiem = m[3]
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    if (!meridiem && hour < 7 && !m[2]) return undefined // bare "5" too ambiguous
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }
  return undefined
}

function extractService(text: string, services: AppointmentType[]): { id: string; name: string } | undefined {
  const lower = text.toLowerCase()
  // Try full name match first, then any word from name
  for (const s of services) {
    if (lower.includes(s.name.toLowerCase())) return { id: s.id, name: s.name }
  }
  for (const s of services) {
    const words = s.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    for (const w of words) {
      if (lower.includes(w)) return { id: s.id, name: s.name }
    }
  }
  return undefined
}

function extractCapacity(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(\d+)\s*(?:spots?|seats?|people|persons?|guests?|tickets?)\b/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n > 0 && n < 100) return n
  }
  return undefined
}

export function extractIntent(text: string, services: AppointmentType[]): ExtractedIntent {
  const service = extractService(text, services)
  return {
    serviceId: service?.id,
    serviceName: service?.name,
    date: extractDate(text),
    time: extractTime(text),
    capacity: extractCapacity(text),
  }
}

export function intentIsBookingRequest(text: string): boolean {
  return /\b(book|schedule|appoint|reserve|set up|need|want)\b/i.test(text)
}
