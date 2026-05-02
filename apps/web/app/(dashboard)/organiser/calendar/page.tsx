'use client'
import { Calendar } from 'lucide-react'

export default function OrganiserCalendarPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}
        >
          Calendar View
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Weekly calendar with all bookings
        </p>
      </div>

      <div
        className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
      >
        <Calendar size={48} style={{ color: 'var(--text-muted)' }} />
        <p className="mt-4 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
          Calendar View
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Coming in Phase 3 — CSS Grid weekly view with color-coded booking blocks
        </p>
      </div>
    </div>
  )
}
