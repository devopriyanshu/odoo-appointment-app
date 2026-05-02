'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { useService } from '@/hooks/useServices'
import { useSlots } from '@/hooks/useSlots'
import { DatePicker } from '@/components/booking/DatePicker'
import { SlotGrid } from '@/components/booking/SlotGrid'
import type { SlotResult, Resource } from '@/types'

type Step = 'provider' | 'datetime' | 'questions'

export default function BookServicePage({ params }: { params: { serviceId: string } }) {
  const { serviceId } = params
  const router = useRouter()
  const { data: service, isLoading } = useService(serviceId)
  const [step, setStep] = useState<Step>('datetime')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null)

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  const { data: slotsData, isLoading: slotsLoading } = useSlots(
    serviceId,
    dateStr,
    selectedResource?.id
  )

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} /></div>
  }

  if (!service) return null

  const handleContinue = () => {
    if (!selectedSlot || !selectedDate) return
    const params = new URLSearchParams({
      serviceId,
      scheduledStart: selectedSlot.startTime.toString(),
      ...(selectedResource?.id && { resourceId: selectedResource.id }),
    })
    router.push(`/book/confirm?${params.toString()}`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            {service.name}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{service.durationMinutes} min · {service.location}</p>
        </div>
      </div>

      {/* Provider selection */}
      {service.resources && service.resources.length > 1 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Select Provider</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setSelectedResource(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${!selectedResource ? 'text-white' : ''}`}
              style={!selectedResource ? { background: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <User size={14} /> Any Available
            </button>
            {service.resources.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedResource(r)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedResource?.id === r.id ? 'text-white' : ''}`}
                style={selectedResource?.id === r.id ? { background: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'var(--brand-accent-2)' }}>
                  {r.name[0]}
                </div>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date + Slot picker */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Select Date</h2>
          <DatePicker selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            {selectedDate ? `Available on ${format(selectedDate, 'EEE, MMM d')}` : 'Select a date first'}
          </h2>
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', minHeight: 200 }}>
            <SlotGrid
              slots={slotsData?.slots || []}
              selectedSlot={selectedSlot?.startTime?.toString() || null}
              onSelect={(slot) => setSelectedSlot(slot)}
              isLoading={slotsLoading && !!dateStr}
              message={slotsData?.message}
              date={dateStr}
            />
          </div>
        </div>
      </div>

      {/* Continue */}
      {selectedSlot && (
        <div className="mt-6 flex items-center justify-between rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--brand-accent)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d')} · {format(new Date(selectedSlot.startTime), 'h:mm a')}
            </p>
            {selectedResource && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>with {selectedResource.name}</p>}
          </div>
          <button onClick={handleContinue}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--brand-accent)' }}>
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
