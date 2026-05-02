'use client'
import { format } from 'date-fns'
import { CalendarCheck, CheckCircle, X } from 'lucide-react'
import type { BookingAction } from '@/types'

interface Props {
  action: BookingAction
  serviceName?: string
  onConfirm: () => void
  onDeny: () => void
  loading?: boolean
}

export function SlotSuggestionCard({ action, serviceName, onConfirm, onDeny, loading }: Props) {
  const start = new Date(action.scheduledStart)
  const end = new Date(start.getTime() + 30 * 60 * 1000) // assume 30 min default

  return (
    <div className="rounded-2xl overflow-hidden mt-1"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--brand-accent)' }}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(108,99,255,0.3)' }}>
        <CalendarCheck size={14} style={{ color: 'var(--brand-accent)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--brand-accent)' }}>Suggested Booking</span>
      </div>

      {/* Details */}
      <div className="px-3 py-2.5 space-y-1">
        {serviceName && (
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{serviceName}</p>
        )}
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {format(start, 'EEEE, MMMM d, yyyy')}
        </p>
        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Capacity: {action.capacity ?? 1} spot{(action.capacity ?? 1) > 1 ? 's' : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: '#00d4aa' }}>
          <CheckCircle size={13} />
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
        <button
          onClick={onDeny}
          disabled={loading}
          className="flex items-center justify-center w-9 rounded-xl transition-all hover:bg-[var(--surface-2)]"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
