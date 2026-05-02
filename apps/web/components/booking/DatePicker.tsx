'use client'
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths, getDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  selectedDate: Date | null
  onSelect: (date: Date) => void
  minDate?: Date
}

export function DatePicker({ selectedDate, onSelect, minDate }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())
  const minimum = minDate ? startOfDay(minDate) : today

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const firstDayOfWeek = getDay(startOfMonth(currentMonth))

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first week offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const isPast = isBefore(startOfDay(day), minimum)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isToday = isSameDay(day, today)

          return (
            <button
              key={day.toString()}
              onClick={() => !isPast && onSelect(day)}
              disabled={isPast}
              className={cn(
                'aspect-square rounded-xl text-xs font-medium transition-all flex items-center justify-center',
                isPast && 'opacity-30 cursor-not-allowed',
                isSelected && 'text-white',
                !isSelected && !isPast && 'hover:bg-[var(--surface-3)]',
                isToday && !isSelected && 'font-bold'
              )}
              style={
                isSelected
                  ? { background: 'var(--brand-accent)', color: 'white' }
                  : isToday
                  ? { color: 'var(--brand-accent)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
