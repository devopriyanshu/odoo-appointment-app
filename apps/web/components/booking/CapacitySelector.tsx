'use client'
import { Minus, Plus } from 'lucide-react'

interface Props {
  value: number
  onChange: (v: number) => void
  max: number
  min?: number
}

export function CapacitySelector({ value, onChange, max, min = 1 }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <Minus size={16} />
        </button>
        <div className="text-center">
          <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
            {value}
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            spot{value !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <Plus size={16} />
        </button>
      </div>
      <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        You are booking <strong style={{ color: 'var(--text-primary)' }}>{value}</strong> spot{value !== 1 ? 's' : ''}.{' '}
        <span style={{ color: 'var(--brand-accent-2)' }}>{max - value} remaining</span> after your booking.
      </p>
    </div>
  )
}
