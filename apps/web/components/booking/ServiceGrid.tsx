'use client'
import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useServices } from '@/hooks/useServices'
import { ServiceCard } from './ServiceCard'
import { ServiceCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Calendar } from 'lucide-react'
import type { AppointmentType } from '@/types'

const DURATION_FILTERS = [
  { label: 'All', value: '' },
  { label: '30 min', value: '30' },
  { label: '60 min', value: '60' },
  { label: '90 min', value: '90' },
]

export function ServiceGrid() {
  const { data: services, isLoading } = useServices()
  const [search, setSearch] = useState('')
  const [durationFilter, setDurationFilter] = useState('')

  const filtered = (services ?? []).filter((s: AppointmentType) => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchDuration = !durationFilter || s.durationMinutes === parseInt(durationFilter)
    return matchSearch && matchDuration
  })

  return (
    <div>
      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-2">
          {DURATION_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setDurationFilter(f.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={durationFilter === f.value
                ? { background: 'var(--brand-accent)', color: 'white' }
                : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={56} />}
          title={search ? 'No services match your search' : 'No services available'}
          description={search ? 'Try a different search term or clear filters.' : 'Check back soon for available appointments.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s: AppointmentType) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  )
}
