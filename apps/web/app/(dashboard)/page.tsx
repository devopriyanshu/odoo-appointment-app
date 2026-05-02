'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Clock } from 'lucide-react'
import { useServices } from '@/hooks/useServices'
import { useAuthStore } from '@/store/authStore'
import { ServiceCard } from '@/components/booking/ServiceCard'
import { ServiceCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { AppointmentType } from '@/types'

const filters = ['All', '30 min', '60 min', '90 min']

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: services, isLoading } = useServices()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  // Admin users don't book appointments — redirect to dashboard
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      router.replace('/organiser')
    }
  }, [user?.role, router])

  const filtered = (services || []).filter((s: AppointmentType) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = activeFilter === 'All' || s.durationMinutes === parseInt(activeFilter)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          Book an Appointment
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Choose a service and find a time that works for you
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              activeFilter === f
                ? { background: 'var(--brand-accent)', color: 'white' }
                : { background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }
            }
          >
            {f !== 'All' && <Clock size={12} className="inline mr-1" />}{f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={64} />}
          title="No services found"
          description={search ? `No results for "${search}"` : 'No services are available yet.'}
          actionLabel={search ? 'Clear search' : undefined}
          onAction={search ? () => setSearch('') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service: AppointmentType) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}
