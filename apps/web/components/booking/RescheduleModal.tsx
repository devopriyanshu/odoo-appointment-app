'use client'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CalendarDays } from 'lucide-react'
import { DatePicker } from '@/components/booking/DatePicker'
import { SlotGrid } from '@/components/booking/SlotGrid'
import { useSlots } from '@/hooks/useSlots'
import { useRescheduleBooking } from '@/hooks/useBookings'
import type { Booking, SlotResult } from '@/types'

interface Props {
  booking: Booking
  open: boolean
  onClose: () => void
}

export function RescheduleModal({ booking, open, onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: slotsData, isLoading: slotsLoading } = useSlots(
    booking.appointmentTypeId,
    dateStr,
    booking.resourceId ?? undefined
  )

  const reschedule = useRescheduleBooking()

  const handleConfirm = () => {
    if (!selectedSlot) return
    reschedule.mutate(
      { id: booking.id, scheduledStart: selectedSlot.startTime.toString() },
      { onSuccess: onClose }
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full z-50 overflow-y-auto"
            style={{ width: '420px', maxWidth: '100vw', background: 'var(--surface-1)', borderLeft: '1px solid var(--border-color)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
              style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
              <div>
                <h2 className="font-bold text-base" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                  Reschedule Appointment
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {booking.appointmentType?.name}
                </p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
                style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Current booking (greyed out) */}
            <div className="mx-5 mt-4 p-3 rounded-xl" style={{ background: 'var(--surface-3)', opacity: 0.6 }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Current booking</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {format(parseISO(booking.scheduledStart), 'EEEE, MMM d')} at {format(parseISO(booking.scheduledStart), 'h:mm a')}
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Date picker */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Select New Date</h3>
                <DatePicker
                  selectedDate={selectedDate}
                  onSelect={d => { setSelectedDate(d); setSelectedSlot(null) }}
                />
              </div>

              {/* Slot grid */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Available Slots — {format(selectedDate, 'EEE, MMM d')}
                </h3>
                <SlotGrid
                  slots={slotsData?.slots ?? []}
                  selectedSlot={selectedSlot?.startTime ?? null}
                  onSelect={setSelectedSlot}
                  isLoading={slotsLoading}
                  message={slotsData?.message}
                  date={dateStr}
                />
              </div>

              {/* Confirm */}
              <button
                disabled={!selectedSlot || reschedule.isPending}
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: 'var(--brand-accent)' }}
              >
                {reschedule.isPending ? 'Rescheduling...' : selectedSlot
                  ? `Confirm — ${format(new Date(selectedSlot.startTime), 'MMM d, h:mm a')}`
                  : 'Select a slot to continue'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
