'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useBookings } from '@/hooks/useBookings'
import type { Booking } from '@/types'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7am–7pm
const COLORS = ['#6c63ff', '#00d4aa', '#4da6ff', '#f0a500', '#ff4d6d', '#9966ff']

export default function OrganiserCalendarPage() {
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const from = format(weekStart, 'yyyy-MM-dd')
  const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  const { data, isLoading } = useBookings({ limit: 100, from, to })
  const bookings = data?.bookings || []

  // Color map by service
  const serviceColors = useMemo(() => {
    const map: Record<string, string> = {}
    const uniqueServices = Array.from(new Set(bookings.map((b: Booking) => b.appointmentType?.id)))
    uniqueServices.forEach((id: string, i: number) => { map[id] = COLORS[i % COLORS.length] })
    return map
  }, [bookings])

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b: Booking) => isSameDay(new Date(b.scheduledStart), day))

  const getPosition = (b: Booking) => {
    const start = new Date(b.scheduledStart)
    const hour = start.getHours()
    const minute = start.getMinutes()
    const top = ((hour - 7) * 60 + minute) * (48 / 60) // 48px per hour
    const height = (b.appointmentType?.durationMinutes || 30) * (48 / 60)
    return { top: Math.max(top, 0), height: Math.max(height, 20) }
  }

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"
            style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            <Calendar size={24} style={{ color: 'var(--brand-accent)' }} />
            Calendar View
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentWeek(new Date())}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--brand-accent)', color: 'white' }}>
            Today
          </button>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="py-3 px-2" />
          {weekDays.map((day) => (
            <div key={day.toString()} className="py-3 px-2 text-center"
              style={{ borderLeft: '1px solid var(--border-color)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {format(day, 'EEE')}
              </p>
              <p className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'w-8 h-8 rounded-full flex items-center justify-center mx-auto text-white' : ''}`}
                style={{
                  color: isToday(day) ? 'white' : 'var(--text-primary)',
                  background: isToday(day) ? 'var(--brand-accent)' : 'transparent',
                  fontFamily: 'Plus Jakarta Sans',
                }}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="relative overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ minHeight: HOURS.length * 48 }}>
              {/* Time labels */}
              <div className="relative">
                {HOURS.map((hour) => (
                  <div key={hour} className="absolute w-full text-right pr-2 text-xs"
                    style={{ top: (hour - 7) * 48 - 6, color: 'var(--text-muted)' }}>
                    {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dayBookings = getBookingsForDay(day)
                return (
                  <div key={day.toString()} className="relative"
                    style={{ borderLeft: '1px solid var(--border-color)', minHeight: HOURS.length * 48 }}>
                    {/* Hour lines */}
                    {HOURS.map((hour) => (
                      <div key={hour} className="absolute w-full"
                        style={{ top: (hour - 7) * 48, height: 1, background: 'var(--border-color)' }} />
                    ))}

                    {/* Booking blocks */}
                    {dayBookings.map((b: Booking) => {
                      const { top, height } = getPosition(b)
                      const color = serviceColors[b.appointmentType?.id] || '#6c63ff'
                      return (
                        <div
                          key={b.id}
                          onClick={() => router.push(`/appointments/${b.id}`)}
                          className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer transition-all hover:opacity-80 overflow-hidden"
                          style={{
                            top,
                            height: Math.max(height, 24),
                            background: `${color}20`,
                            borderLeft: `3px solid ${color}`,
                            zIndex: 10,
                          }}
                        >
                          <p className="text-xs font-semibold truncate" style={{ color }}>
                            {format(new Date(b.scheduledStart), 'h:mm a')}
                          </p>
                          {height > 30 && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                              {b.customer?.name}
                            </p>
                          )}
                          {height > 45 && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {b.appointmentType?.name}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {Object.entries(serviceColors).map(([id, color]) => {
            const service = bookings.find((b: Booking) => b.appointmentType?.id === id)?.appointmentType
            return (
              <div key={id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-3 h-3 rounded" style={{ background: color }} />
                {service?.name || 'Unknown'}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
