'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { MapPin, Clock, Eye, CalendarDays } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { DatePicker } from '@/components/booking/DatePicker'
import { SlotGrid } from '@/components/booking/SlotGrid'
import { useSlots } from '@/hooks/useSlots'
import type { AppointmentType, SlotResult } from '@/types'

export default function ShareBookingPage() {
  const { token } = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: service, isLoading, error } = useQuery<AppointmentType>({
    queryKey: ['services', 'share', token],
    queryFn: async () => {
      const r = await api.get(`/services/share/${token}`)
      return r.data.service ?? r.data.data ?? r.data
    },
    retry: false,
  })

  const { data: slotsData, isLoading: slotsLoading } = useSlots(
    service?.id ?? '',
    dateStr
  )

  const handleProceed = () => {
    if (!selectedSlot || !service) return
    const params = new URLSearchParams({
      serviceId: service.id,
      scheduledStart: selectedSlot.startTime,
      fromShare: 'true',
    })
    if (!isAuthenticated) {
      router.push(`/login?redirect=/book/${service.id}`)
      return
    }
    router.push(`/book/${service.id}?date=${format(selectedDate, 'yyyy-MM-dd')}&slot=${selectedSlot.startTime}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--brand-accent)' }} />
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: 'var(--brand-primary)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,77,109,0.15)' }}>
          <CalendarDays size={28} style={{ color: '#ff4d6d' }} />
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Link Not Found</h1>
        <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
          This booking link is invalid or has been removed by the organiser.
        </p>
        <button onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--brand-accent)' }}>
          Browse Services
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-primary)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--brand-accent)' }}>A</div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Book Appointment</span>
        </div>
        {!service.isPublished && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(240,165,0,0.15)', color: '#f0a500', border: '1px solid rgba(240,165,0,0.3)' }}>
            <Eye size={11} />
            Preview
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Service header */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          {/* Gradient banner */}
          <div className="h-28" style={{ background: 'linear-gradient(135deg, var(--brand-accent) 0%, #00d4aa 100%)' }} />
          <div className="px-5 py-4">
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
              {service.name}
            </h1>
            {service.description && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{service.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={13} />
                {service.durationMinutes} min
              </div>
              {service.location && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={13} />
                  {service.location}
                </div>
              )}
              {service.requiresAdvancePayment && service.advancePaymentAmount && (
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--brand-accent)' }}>
                  ₹{service.advancePaymentAmount} advance
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date + Slot picker */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Select Date</h2>
            <DatePicker
              selectedDate={selectedDate}
              onSelect={d => { setSelectedDate(d); setSelectedSlot(null) }}
            />
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Available Slots — {format(selectedDate, 'EEE, MMM d')}
            </h2>
            <SlotGrid
              slots={slotsData?.slots ?? []}
              selectedSlot={selectedSlot?.startTime ?? null}
              onSelect={setSelectedSlot}
              isLoading={slotsLoading}
              message={slotsData?.message}
              date={dateStr}
            />
          </div>
        </div>

        {/* CTA */}
        {selectedSlot && (
          <div className="rounded-2xl p-4 flex items-center justify-between gap-4"
            style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {format(new Date(selectedSlot.startTime), 'EEEE, MMM d')} at {format(new Date(selectedSlot.startTime), 'h:mm a')}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{service.name} · {service.durationMinutes} min</p>
            </div>
            <button onClick={handleProceed}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:opacity-90"
              style={{ background: 'var(--brand-accent)' }}>
              {isAuthenticated ? 'Book Now' : 'Sign in to Book'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
