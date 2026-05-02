import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'h:mm a')
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy • h:mm a')
}

export function formatDateRelative(date: string | Date) {
  const d = new Date(date)
  if (isToday(d)) return `Today at ${formatTime(d)}`
  if (isTomorrow(d)) return `Tomorrow at ${formatTime(d)}`
  if (isPast(d)) return formatDistanceToNow(d, { addSuffix: true })
  return format(d, 'EEE, MMM d') + ' at ' + formatTime(d)
}

export function getStatusClass(status: string) {
  return `status-badge--${status.toLowerCase().replace('_', '_')}`
}

export function getGoogleCalendarUrl(booking: {
  scheduledStart: string
  scheduledEnd: string
  appointmentType: { name: string; location?: string | null }
}) {
  const start = format(new Date(booking.scheduledStart), "yyyyMMdd'T'HHmmss")
  const end = format(new Date(booking.scheduledEnd), "yyyyMMdd'T'HHmmss")
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: booking.appointmentType.name,
    dates: `${start}/${end}`,
    location: booking.appointmentType.location || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function getOutlookUrl(booking: {
  scheduledStart: string
  scheduledEnd: string
  appointmentType: { name: string; location?: string | null }
}) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: booking.appointmentType.name,
    startdt: new Date(booking.scheduledStart).toISOString(),
    enddt: new Date(booking.scheduledEnd).toISOString(),
    location: booking.appointmentType.location || '',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
