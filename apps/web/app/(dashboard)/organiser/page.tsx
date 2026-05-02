'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CalendarDays, CheckCircle, Clock, XCircle, Plus, IndianRupee } from 'lucide-react'
import { format } from 'date-fns'
import api from '@/lib/api'
import { useUpdateBookingStatus, useCancelBooking } from '@/hooks/useBookings'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { StatCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { AnalyticsSummary, Booking } from '@/types'

export default function OrganiserDashboard() {
  const router = useRouter()
  const updateStatus = useUpdateBookingStatus()
  const cancelBooking = useCancelBooking()

  const { data: summary, isLoading: sumLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => { const r = await api.get('/analytics/summary'); return r.data.data },
  })

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<{ bookings: Booking[] }>({
    queryKey: ['bookings', { limit: 10 }],
    queryFn: async () => { const r = await api.get('/bookings', { params: { limit: 10 } }); return r.data },
  })

  const stats = [
    { label: 'Total Bookings', value: summary?.totalBookings || 0, icon: <CalendarDays size={20} />, color: '#4da6ff' },
    { label: 'Confirmed', value: summary?.confirmedCount || 0, icon: <CheckCircle size={20} />, color: '#00d4aa' },
    { label: 'Pending', value: summary?.pendingCount || 0, icon: <Clock size={20} />, color: '#f0a500' },
    { label: 'Revenue (month)', value: `₹${(summary?.revenueTotal || 0).toLocaleString()}`, icon: <IndianRupee size={20} />, color: '#6c63ff' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          Organiser Dashboard
        </h1>
        <button onClick={() => router.push('/organiser/services/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--brand-accent)' }}>
          <Plus size={16} /> New Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            Recent Bookings
          </h2>
          <button onClick={() => router.push('/organiser/bookings')} className="text-xs" style={{ color: 'var(--brand-accent)' }}>
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Customer', 'Service', 'Date', 'Provider', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookingsLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : (bookingsData?.bookings || []).map((b) => (
                <tr key={b.id} onClick={() => router.push(`/appointments/${b.id}`)} className="cursor-pointer transition-all hover:bg-[var(--surface-3)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{b.customer.name}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{b.appointmentType.name}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{format(new Date(b.scheduledStart), 'MMM d, h:mm a')}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{b.resource?.name || '—'}</td>
                  <td className="px-5 py-3"><BookingStatusBadge status={b.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {b.status === 'PENDING' && (
                        <button onClick={() => updateStatus.mutate({ id: b.id, action: 'confirm' })}
                          className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(0,212,170,0.15)', color: '#00d4aa' }}>
                          Confirm
                        </button>
                      )}
                      {b.status === 'CONFIRMED' && new Date(b.scheduledStart) < new Date() && (
                        <>
                          <button onClick={() => updateStatus.mutate({ id: b.id, action: 'complete' })}
                            className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--brand-accent)' }}>
                            Complete
                          </button>
                          <button onClick={() => updateStatus.mutate({ id: b.id, action: 'no-show' })}
                            className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(240,165,0,0.15)', color: '#f0a500' }}>
                            No-show
                          </button>
                        </>
                      )}
                      {(b.status === 'PENDING' || b.status === 'CONFIRMED') && new Date(b.scheduledStart) > new Date() && (
                        <button onClick={() => cancelBooking.mutate({ id: b.id })}
                          className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,77,109,0.15)', color: '#ff4d6d' }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
