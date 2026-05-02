'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarX, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useBookings } from '@/hooks/useBookings'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { AppointmentCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { Booking } from '@/types'

type Tab = 'upcoming' | 'past' | 'cancelled'

export default function AppointmentsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('upcoming')
  const { data, isLoading } = useBookings({ limit: 50 })
  const bookings = data?.bookings || []

  const now = new Date()
  const grouped = {
    upcoming: bookings.filter((b) => new Date(b.scheduledStart) >= now && b.status !== 'CANCELLED'),
    past: bookings.filter((b) => new Date(b.scheduledStart) < now && b.status !== 'CANCELLED'),
    cancelled: bookings.filter((b) => b.status === 'CANCELLED'),
  }

  const current = grouped[tab]

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'upcoming', label: 'Upcoming', icon: <Clock size={14} /> },
    { key: 'past', label: 'Past', icon: <CheckCircle size={14} /> },
    { key: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} /> },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
        My Appointments
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key ? { background: 'var(--brand-accent)', color: 'white' } : { color: 'var(--text-muted)' }}>
            {t.icon} {t.label}
            <span className="ml-1 text-xs opacity-70">({grouped[t.key].length})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <AppointmentCardSkeleton key={i} />)}
        </div>
      ) : current.length === 0 ? (
        <EmptyState
          icon={<CalendarX size={64} />}
          title={`No ${tab} appointments`}
          description={tab === 'upcoming' ? 'You have no upcoming appointments. Book one now!' : `No ${tab} appointments to show.`}
          actionLabel={tab === 'upcoming' ? 'Browse Services' : undefined}
          onAction={tab === 'upcoming' ? () => router.push('/') : undefined}
        />
      ) : (
        <div className="space-y-3">
          {current.map((booking) => (
            <AppointmentCard key={booking.id} booking={booking} onClick={() => router.push(`/appointments/${booking.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppointmentCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const start = new Date(booking.scheduledStart)
  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:border-[var(--brand-accent)]"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
    >
      {/* Date block */}
      <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(108,99,255,0.15)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--brand-accent)' }}>{format(start, 'MMM').toUpperCase()}</span>
        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{format(start, 'd')}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {booking.appointmentType.name}
          </h3>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {format(start, 'h:mm a')} · {booking.resource?.name || 'Any provider'}
        </p>
        {booking.appointmentType.location && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            📍 {booking.appointmentType.location}
          </p>
        )}
      </div>
    </div>
  )
}
