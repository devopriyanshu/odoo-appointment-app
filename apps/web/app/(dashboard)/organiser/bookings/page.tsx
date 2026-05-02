'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { useBookings, useUpdateBookingStatus, useCancelBooking } from '@/hooks/useBookings'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import type { BookingStatus } from '@/types'

const STATUS_TABS: Array<BookingStatus | 'ALL'> = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export default function OrganiserBookingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string | undefined>(undefined)
  const { data, isLoading } = useBookings({ status, limit: 50 })
  const updateStatus = useUpdateBookingStatus()
  const cancelBooking = useCancelBooking()

  const exportCSV = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/bookings/export`, '_blank')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          All Bookings
        </h1>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s === 'ALL' ? undefined : s)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={(s === 'ALL' && !status) || status === s
              ? { background: 'var(--brand-accent)', color: 'white' }
              : { color: 'var(--text-muted)' }}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--surface-2)' }}>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {['Customer', 'Service', 'Date/Time', 'Provider', 'Status', 'Code', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: 'var(--surface-1)' }}>
            {isLoading ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : (data?.bookings || []).map((b) => (
              <tr key={b.id} onClick={() => router.push(`/appointments/${b.id}`)} className="cursor-pointer hover:bg-[var(--surface-3)] transition-all" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.customer.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.customer.email}</p>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{b.appointmentType.name}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{format(new Date(b.scheduledStart), 'MMM d • h:mm a')}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{b.resource?.name || '—'}</td>
                <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{b.confirmationCode.slice(0, 8)}</td>
                <td className="px-4 py-3">
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
            {!isLoading && !data?.bookings?.length && (
              <tr><td colSpan={7} className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
