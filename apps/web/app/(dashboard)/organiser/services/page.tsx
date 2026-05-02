'use client'
import { useRouter } from 'next/navigation'
import { Plus, Briefcase, Edit, Eye, ToggleLeft, ToggleRight, Trash2, ExternalLink } from 'lucide-react'
import { useMyServices, useTogglePublish, useDeleteService } from '@/hooks/useServices'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useState } from 'react'
import type { AppointmentType } from '@/types'

export default function ServicesPage() {
  const router = useRouter()
  const { data: services, isLoading } = useMyServices()
  const togglePublish = useTogglePublish('')
  const deleteService = useDeleteService()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          My Services
        </h1>
        <button onClick={() => router.push('/organiser/services/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--brand-accent)' }}>
          <Plus size={16} /> Create Service
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
          ))}
        </div>
      ) : !services?.length ? (
        <EmptyState
          icon={<Briefcase size={64} />}
          title="No services yet"
          description="Create your first appointment type to start accepting bookings."
          actionLabel="Create Service"
          onAction={() => router.push('/organiser/services/new')}
        />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          <table className="w-full">
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Service', 'Duration', 'Type', 'Bookings', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ background: 'var(--surface-1)' }}>
              {services.map((s: AppointmentType) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    {s.location && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.location}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.durationMinutes} min</td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.slotScheduleType}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s._count?.bookings || 0}</td>
                  <td className="px-5 py-4">
                    <span className={s.isPublished ? 'status-badge--confirmed' : 'status-badge--pending'}>
                      {s.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => router.push(`/organiser/services/${s.id}`)} className="p-1.5 rounded-lg hover:bg-[var(--surface-3)]" style={{ color: 'var(--text-muted)' }} title="Edit">
                        <Edit size={14} />
                      </button>
                      {s.shareToken && (
                        <a href={`/book/share/${s.shareToken}`} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] block" style={{ color: 'var(--text-muted)' }} title="Preview / Share">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => { const tp = useTogglePublish; /* handled below */ api_toggle(s.id) }} className="p-1.5 rounded-lg hover:bg-[var(--surface-3)]" style={{ color: 'var(--text-muted)' }} title={s.isPublished ? 'Unpublish' : 'Publish'}>
                        {s.isPublished ? <ToggleRight size={14} style={{ color: '#00d4aa' }} /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: '#ff4d6d' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteService.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
        title="Delete service"
        description="This will permanently delete the service and all its bookings. This cannot be undone."
        confirmLabel="Delete"
        dangerous
        loading={deleteService.isPending}
      />
    </div>
  )
}

async function api_toggle(id: string) {
  const { default: api } = await import('@/lib/api')
  await api.patch(`/services/${id}/publish`)
  const { queryClient } = await import('@/lib/queryClient')
  queryClient.invalidateQueries({ queryKey: ['services'] })
}
