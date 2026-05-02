'use client'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Clock, MapPin, User, CalendarX, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BookingStatusBadge } from './BookingStatusBadge'
import type { Booking } from '@/types'

interface Props {
  booking: Booking
  onCancel?: (id: string) => void
  onReschedule?: (id: string) => void
}

export function AppointmentCard({ booking, onCancel, onReschedule }: Props) {
  const router = useRouter()
  const start = parseISO(booking.scheduledStart)
  const end = parseISO(booking.scheduledEnd)
  const isFuture = start > new Date()
  const canAct = isFuture && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(booking.status)

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
      onClick={() => router.push(`/appointments/${booking.id}`)}
    >
      <div className="flex items-stretch">
        {/* Date column */}
        <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center py-4 border-r"
          style={{ borderColor: 'var(--border-color)', background: 'var(--surface-3)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {format(start, 'MMM')}
          </span>
          <span className="text-3xl font-bold leading-none my-1" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
            {format(start, 'd')}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {format(start, 'EEE')}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
              {booking.appointmentType?.name ?? 'Appointment'}
            </h3>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} />
              {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
            </div>
            {booking.resource?.name && (
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <User size={11} />
                {booking.resource.name}
              </div>
            )}
            {booking.appointmentType?.location && (
              <div className="flex items-center gap-1 text-xs truncate max-w-48" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={11} />
                {booking.appointmentType.location}
              </div>
            )}
          </div>

          {/* Confirmation code */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
              #{booking.confirmationCode?.slice(-8)}
            </span>
            <div className="flex items-center gap-2">
              {canAct && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onReschedule?.(booking.id) }}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all hover:bg-[var(--surface-3)]"
                    style={{ color: 'var(--brand-accent)', border: '1px solid var(--brand-accent)' }}
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onCancel?.(booking.id) }}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all hover:bg-red-500/10"
                    style={{ color: 'var(--danger)', border: '1px solid rgba(255,77,109,0.3)' }}
                  >
                    Cancel
                  </button>
                </>
              )}
              {['COMPLETED', 'CANCELLED'].includes(booking.status) && (
                <button
                  onClick={e => { e.stopPropagation(); router.push('/') }}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{ color: 'var(--brand-accent)', border: '1px solid var(--brand-accent)' }}
                >
                  Book Again
                </button>
              )}
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
