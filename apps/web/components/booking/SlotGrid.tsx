'use client'
import { format } from 'date-fns'
import { SlotGridSkeleton } from '@/components/shared/LoadingSkeleton'
import type { SlotResult } from '@/types'

interface SlotGridProps {
  slots: SlotResult[]
  selectedSlot: string | null
  onSelect: (slot: SlotResult) => void
  isLoading: boolean
  message?: string
  date: string
}

export function SlotGrid({ slots, selectedSlot, onSelect, isLoading, message, date }: SlotGridProps) {
  if (isLoading) return <SlotGridSkeleton />

  if (!date) {
    return (
      <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Select a date to see available slots
      </p>
    )
  }

  if (message || slots.length === 0) {
    return (
      <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        {message || 'No slots available for this date. Try another day.'}
      </p>
    )
  }

  return (
    <div>
      <p className="text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
        {slots.length} slot{slots.length !== 1 ? 's' : ''} available
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {slots.map((slot) => {
          const startStr = slot.startTime.toString()
          const isSelected = selectedSlot === startStr
          return (
            <button
              key={startStr}
              onClick={() => onSelect(slot)}
              className={`slot-pill ${isSelected ? 'slot-pill--selected' : ''}`}
            >
              {format(new Date(slot.startTime), 'h:mm a')}
              {slot.availableCapacity < 5 && !isSelected && (
                <span className="ml-1 text-[10px] opacity-70">({slot.availableCapacity} left)</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
