'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarX, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useBookings, useCancelBooking } from '@/hooks/useBookings'
import { AppointmentCard } from '@/components/booking/AppointmentCard'
import { RescheduleModal } from '@/components/booking/RescheduleModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { AppointmentCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { Booking } from '@/types'

type Tab = 'upcoming' | 'past' | 'cancelled'

export default function AppointmentsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('upcoming')
  const { data, isLoading } = useBookings({ limit: 50 })
  const bookings = data?.bookings || []
  const cancelMutation = useCancelBooking()

  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const now = new Date()
  const grouped = {
    upcoming: bookings.filter((b: Booking) => new Date(b.scheduledStart) >= now && b.status !== 'CANCELLED'),
    past: bookings.filter((b: Booking) => new Date(b.scheduledStart) < now && b.status !== 'CANCELLED'),
    cancelled: bookings.filter((b: Booking) => b.status === 'CANCELLED'),
  }
  const current = grouped[tab]

  const tabs = [
    { key: 'upcoming' as Tab, label: 'Upcoming', icon: <Clock size={14} /> },
    { key: 'past' as Tab, label: 'Past', icon: <CheckCircle size={14} /> },
    { key: 'cancelled' as Tab, label: 'Cancelled', icon: <XCircle size={14} /> },
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
          {current.map((booking: Booking) => (
            <AppointmentCard
              key={booking.id}
              booking={booking}
              onCancel={(id) => setCancelId(id)}
              onReschedule={(id) => {
                const b = bookings.find((x: Booking) => x.id === id)
                if (b) setRescheduleBooking(b)
              }}
            />
          ))}
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          open={!!rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
        />
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          if (cancelId) cancelMutation.mutate({ id: cancelId, cancelReason: 'Cancelled by customer' }, {
            onSuccess: () => setCancelId(null)
          })
        }}
        title="Cancel Appointment?"
        description="Are you sure you want to cancel this appointment? This cannot be undone."
        confirmLabel="Yes, Cancel"
        dangerous
      />
    </div>
  )
}
