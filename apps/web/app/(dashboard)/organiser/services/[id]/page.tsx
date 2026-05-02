'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2, ChevronLeft, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { AppointmentType } from '@/types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DURATIONS = [15, 30, 45, 60, 90, 120]

const schema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(5),
  resourceType: z.enum(['USER', 'RESOURCE']),
  slotScheduleType: z.enum(['WEEKLY', 'FLEXIBLE']),
  maxCapacityPerSlot: z.number().int().min(1),
  manageCapacity: z.boolean(),
  requiresManualConfirm: z.boolean(),
  requiresAdvancePayment: z.boolean(),
  advancePaymentAmount: z.number().positive().optional(),
  location: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--brand-accent)' : 'var(--surface-3)' }}>
      <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(3px)' }} />
    </button>
  )
}

export default function ServiceEditPage() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'details' | 'availability' | 'questions'>('details')
  const [workingHours, setWorkingHours] = useState(
    DAY_NAMES.map((_, i) => ({ dayOfWeek: i, startTime: '09:00', endTime: '17:00', isActive: i >= 1 && i <= 5 }))
  )
  const [questions, setQuestions] = useState<{ id?: string; question: string; isRequired: boolean; sequence: number }[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: service, isLoading } = useQuery<AppointmentType>({
    queryKey: ['services', serviceId],
    queryFn: async () => {
      const r = await api.get(`/services/${serviceId}`)
      return r.data.service ?? r.data.data ?? r.data
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      resourceType: 'USER',
      slotScheduleType: 'WEEKLY',
      durationMinutes: 30,
      maxCapacityPerSlot: 1,
      manageCapacity: false,
      requiresManualConfirm: false,
      requiresAdvancePayment: false,
    },
  })

  // Pre-fill form when service loads
  useEffect(() => {
    if (!service) return
    reset({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: service.durationMinutes,
      resourceType: service.resourceType,
      slotScheduleType: service.slotScheduleType,
      maxCapacityPerSlot: service.maxCapacityPerSlot,
      manageCapacity: service.manageCapacity,
      requiresManualConfirm: service.requiresManualConfirm,
      requiresAdvancePayment: service.requiresAdvancePayment,
      advancePaymentAmount: service.advancePaymentAmount ?? undefined,
      location: service.location ?? '',
    })
    if (service.workingHours?.length) {
      setWorkingHours(DAY_NAMES.map((_, i) => {
        const wh = service.workingHours.find((h: any) => h.dayOfWeek === i)
        return wh ? { dayOfWeek: i, startTime: wh.startTime, endTime: wh.endTime, isActive: wh.isActive } : { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isActive: false }
      }))
    }
    if (service.bookingQuestions?.length) {
      setQuestions(service.bookingQuestions.map((q: any) => ({ id: q.id, question: q.question, isRequired: q.isRequired, sequence: q.sequence })))
    }
  }, [service, reset])

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.patch(`/services/${serviceId}`, data),
    onSuccess: () => {
      toast.success('Service updated successfully')
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: () => toast.error('Failed to update service'),
  })

  const saveHoursMutation = useMutation({
    mutationFn: () => api.post(`/services/${serviceId}/working-hours`, { hours: workingHours }),
    onSuccess: () => toast.success('Working hours saved'),
    onError: () => toast.error('Failed to save hours'),
  })

  const addQuestionMutation = useMutation({
    mutationFn: (q: { question: string; isRequired: boolean; sequence: number }) =>
      api.post(`/services/${serviceId}/questions`, q),
    onSuccess: (r) => {
      const q = r.data.question ?? r.data
      setQuestions(prev => [...prev, { id: q.id, question: q.question, isRequired: q.isRequired, sequence: q.sequence }])
      setNewQuestion('')
      setNewRequired(false)
      toast.success('Question added')
    },
    onError: () => toast.error('Failed to add question'),
  })

  const deleteQuestionMutation = useMutation({
    mutationFn: (qid: string) => api.delete(`/services/${serviceId}/questions/${qid}`),
    onSuccess: (_, qid) => {
      setQuestions(prev => prev.filter(q => q.id !== qid))
      toast.success('Question removed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/services/${serviceId}`),
    onSuccess: () => {
      toast.success('Service deleted')
      router.push('/organiser/services')
    },
    onError: () => toast.error('Failed to delete service'),
  })

  const handleCopyShareLink = () => {
    if (!service?.shareToken) return
    const url = `${window.location.origin}/book/share/${service.shareToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Share link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const requiresPayment = watch('requiresAdvancePayment')
  const duration = watch('durationMinutes')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--brand-accent)' }} />
      </div>
    )
  }

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'availability', label: 'Availability' },
    { key: 'questions', label: 'Questions' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/organiser/services')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            Edit Service
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{service?.name}</p>
        </div>
      </div>

      {/* Share Link Card */}
      {service?.shareToken && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Share Link</p>
              <p className="text-xs mt-0.5 font-mono truncate max-w-sm" style={{ color: 'var(--text-muted)' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/book/share/${service.shareToken}` : `/book/share/${service.shareToken}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopyShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: copied ? '#00d4aa' : 'var(--brand-accent)', color: 'white' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {service.isPublished && (
                <a href={`/book/share/${service.shareToken}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key ? { background: 'var(--brand-accent)', color: 'white' } : { color: 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Details ── */}
      {tab === 'details' && (
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Service Name *</label>
              <input {...register('name')}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: `1px solid ${errors.name ? 'var(--danger)' : 'var(--border-color)'}` }} />
              {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.name.message}</p>}
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <textarea {...register('description')} rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            </div>
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => setValue('durationMinutes', d)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={duration === d ? { background: 'var(--brand-accent)', color: 'white' } : { background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            {/* Location */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input {...register('location')} placeholder="Address or virtual link"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            </div>
            {/* Booking Rules */}
            <div className="space-y-3 pt-1">
              {[
                { field: 'manageCapacity', label: 'Manage Capacity', desc: 'Let customers choose number of spots' },
                { field: 'requiresManualConfirm', label: 'Manual Confirmation', desc: 'You approve each booking manually' },
                { field: 'requiresAdvancePayment', label: 'Advance Payment', desc: 'Collect payment at booking time' },
              ].map(item => (
                <div key={item.field} className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                  <Toggle checked={watch(item.field as any)} onChange={v => setValue(item.field as any, v)} />
                </div>
              ))}
              {requiresPayment && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Payment Amount (₹)</label>
                  <input type="number" {...register('advancePaymentAmount', { valueAsNumber: true })} min={1}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                </div>
              )}
            </div>
          </div>
          <button type="submit" disabled={updateMutation.isPending || !isDirty}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--brand-accent)' }}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* ── Tab: Availability ── */}
      {tab === 'availability' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Working Hours</h2>
            {workingHours.map((wh, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                <Toggle checked={wh.isActive} onChange={v => setWorkingHours(prev => prev.map((h, idx) => idx === i ? { ...h, isActive: v } : h))} />
                <span className="w-20 text-sm" style={{ color: wh.isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>{DAY_NAMES[i]}</span>
                {wh.isActive ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={wh.startTime} onChange={e => setWorkingHours(prev => prev.map((h, idx) => idx === i ? { ...h, startTime: e.target.value } : h))}
                      className="px-2 py-1 rounded-lg text-sm outline-none flex-1"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                    <input type="time" value={wh.endTime} onChange={e => setWorkingHours(prev => prev.map((h, idx) => idx === i ? { ...h, endTime: e.target.value } : h))}
                      className="px-2 py-1 rounded-lg text-sm outline-none flex-1"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                  </div>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Closed</span>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => saveHoursMutation.mutate()} disabled={saveHoursMutation.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--brand-accent)' }}>
            {saveHoursMutation.isPending ? 'Saving...' : 'Save Working Hours'}
          </button>
        </div>
      )}

      {/* ── Tab: Questions ── */}
      {tab === 'questions' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Booking Questions</h2>
            {questions.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No questions added yet</p>
            )}
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                  <span className="text-xs" style={{ color: q.isRequired ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {q.isRequired ? 'Required' : 'Optional'}
                  </span>
                </div>
                {q.id && (
                  <button onClick={() => deleteQuestionMutation.mutate(q.id!)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-red-500/10"
                    style={{ color: 'var(--danger)' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {/* Add question form */}
            <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
              <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Type your question..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={newRequired} onChange={setNewRequired} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Required</span>
                </label>
                <button onClick={() => {
                  if (!newQuestion.trim()) return
                  addQuestionMutation.mutate({ question: newQuestion.trim(), isRequired: newRequired, sequence: questions.length })
                }}
                  disabled={!newQuestion.trim() || addQuestionMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: 'var(--brand-accent)' }}>
                  Add Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,77,109,0.05)', border: '1px solid rgba(255,77,109,0.25)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Danger Zone</h2>
            <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-muted)' }}>
              Deleting a service is permanent and will remove all associated bookings and questions.
            </p>
            <button onClick={() => setShowDeleteDialog(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,77,109,0.15)', color: 'var(--danger)', border: '1px solid rgba(255,77,109,0.3)' }}>
              <Trash2 size={13} className="inline mr-1.5" />
              Delete Service
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Service?"
        description={`Are you sure you want to delete "${service?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        dangerous
      />
    </div>
  )
}
