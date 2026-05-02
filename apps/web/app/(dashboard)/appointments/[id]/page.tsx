'use client'
import { use, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ChevronLeft, Copy, Check, CalendarPlus, Clock, MapPin } from 'lucide-react'
import { useBooking, useCancelBooking, useRescheduleBooking } from '@/hooks/useBookings'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DatePicker } from '@/components/booking/DatePicker'
import { SlotGrid } from '@/components/booking/SlotGrid'
import { useSlots } from '@/hooks/useSlots'
import { getGoogleCalendarUrl, getOutlookUrl } from '@/lib/utils'
import type { SlotResult } from '@/types'

function BookingDetailInner({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isConfirmed = searchParams.get('confirmed') === '1'
  const { data: booking, isLoading } = useBooking(id)
  const cancelBooking = useCancelBooking()
  const rescheduleBooking = useRescheduleBooking()
  const [copied, setCopied] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null)
  const [rescheduleSlot, setRescheduleSlot] = useState<SlotResult | null>(null)

  const reschedDateStr = rescheduleDate ? format(rescheduleDate, 'yyyy-MM-dd') : ''
  const { data: reschedSlots, isLoading: reschedLoading } = useSlots(
    booking?.appointmentTypeId || '',
    reschedDateStr,
    booking?.resourceId || undefined
  )

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} /></div>
  if (!booking) return null

  const isFuture = new Date(booking.scheduledStart) > new Date()
  const canCancel = isFuture && !['CANCELLED', 'COMPLETED'].includes(booking.status)
  const canReschedule = isFuture && !['CANCELLED', 'COMPLETED'].includes(booking.status)

  const copyCode = () => {
    navigator.clipboard.writeText(booking.confirmationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCancel = () => {
    cancelBooking.mutate({ id: booking.id, cancelReason }, {
      onSuccess: () => { setCancelOpen(false); router.push('/appointments') }
    })
  }

  const handleReschedule = () => {
    if (!rescheduleSlot) return
    rescheduleBooking.mutate({ id: booking.id, scheduledStart: rescheduleSlot.startTime.toString() }, {
      onSuccess: () => setRescheduleOpen(false)
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success animation */}
      {isConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,212,170,0.2)' }}
          >
            <Check size={24} style={{ color: '#00d4aa' }} />
          </motion.div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: '#00d4aa' }}>
              {booking.status === 'PENDING' ? 'Booking Reserved!' : 'Booking Confirmed!'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {booking.status === 'PENDING' ? 'You\'ll get an email when the organiser confirms.' : 'We look forward to seeing you!'}
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/appointments')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          Appointment Detail
        </h1>
      </div>

      {/* Status + code */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-3">
          <BookingStatusBadge status={booking.status} />
          <button onClick={copyCode} className="flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            style={{ color: 'var(--brand-accent)', border: '1px solid var(--border-color)' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {booking.confirmationCode.slice(0, 12)}...
          </button>
        </div>
        <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          {booking.appointmentType.name}
        </h2>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2"><Clock size={14} /> {format(new Date(booking.scheduledStart), 'EEEE, MMMM d, yyyy • h:mm a')}</div>
          <div className="flex items-center gap-2"><Clock size={14} /> {booking.appointmentType.durationMinutes} minutes</div>
          {booking.appointmentType.location && <div className="flex items-center gap-2"><MapPin size={14} /> {booking.appointmentType.location}</div>}
          {booking.resource && <div className="flex items-center gap-2">👤 {booking.resource.name}</div>}
        </div>
      </div>

      {/* Payment */}
      {booking.paymentStatus === 'PAID' && (
        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#00d4aa' }}>Payment Received</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{booking.paymentReference}</p>
          </div>
          <p className="text-lg font-bold" style={{ color: '#00d4aa' }}>₹{Number(booking.paymentAmount).toLocaleString()}</p>
        </div>
      )}

      {/* Answers */}
      {booking.answers && booking.answers.length > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold mb-3" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>Booking Information</h3>
          <div className="space-y-3">
            {booking.answers.map((a) => (
              <div key={a.id}>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{a.question.question}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="flex gap-3 mb-4">
        <a href={getGoogleCalendarUrl(booking)} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <CalendarPlus size={15} /> Google Calendar
        </a>
        <a href={getOutlookUrl(booking)} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <CalendarPlus size={15} /> Outlook
        </a>
      </div>

      {/* Actions */}
      {(canReschedule || canCancel) && (
        <div className="flex gap-3">
          {canReschedule && (
            <button onClick={() => setRescheduleOpen(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--brand-accent)', color: 'white' }}>
              Reschedule
            </button>
          )}
          {canCancel && (
            <button onClick={() => setCancelOpen(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10"
              style={{ border: '1px solid rgba(255,77,109,0.3)', color: '#ff4d6d' }}>
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Audit log */}
      {booking.auditLog && booking.auditLog.length > 0 && (
        <div className="rounded-2xl p-5 mt-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold mb-3 text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-secondary)' }}>Activity Log</h3>
          <div className="space-y-2">
            {booking.auditLog.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>{log.action}</span>
                <span style={{ color: 'var(--text-muted)' }}>{format(new Date(log.createdAt), 'MMM d, h:mm a')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel dialog */}
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel}
        title="Cancel appointment" description="Are you sure you want to cancel?" confirmLabel="Cancel Booking"
        dangerous loading={cancelBooking.isPending}>
        <textarea
          value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-2"
          rows={2}
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
      </ConfirmDialog>

      {/* Reschedule dialog */}
      <ConfirmDialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} onConfirm={handleReschedule}
        title="Reschedule appointment" description="Pick a new date and time"
        confirmLabel="Confirm Reschedule" loading={rescheduleBooking.isPending}>
        <div className="mt-3 space-y-4">
          <DatePicker selectedDate={rescheduleDate} onSelect={setRescheduleDate} />
          {rescheduleDate && (
            <SlotGrid
              slots={reschedSlots?.slots || []}
              selectedSlot={rescheduleSlot?.startTime?.toString() || null}
              onSelect={setRescheduleSlot}
              isLoading={reschedLoading}
              message={reschedSlots?.message}
              date={reschedDateStr}
            />
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} /></div>}>
      <BookingDetailInner id={id} />
    </Suspense>
  )
}
