'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import { useCreateService, useSetWorkingHours, useAddQuestion } from '@/hooks/useServices'

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

const defaultHours = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '17:00',
  isActive: i >= 1 && i <= 5,
}))

export default function NewServicePage() {
  const router = useRouter()
  const createService = useCreateService()
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [workingHours, setWorkingHours] = useState(defaultHours)
  const [questions, setQuestions] = useState<Array<{ question: string; isRequired: boolean }>>([])
  const [newQ, setNewQ] = useState('')
  const [newQRequired, setNewQRequired] = useState(false)
  const addQ = useAddQuestion(serviceId || '')
  const setWH = useSetWorkingHours(serviceId || '')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { durationMinutes: 30, resourceType: 'USER', slotScheduleType: 'WEEKLY', manageCapacity: false, requiresManualConfirm: false, requiresAdvancePayment: false, maxCapacityPerSlot: 1 },
  })

  const watchPay = watch('requiresAdvancePayment')
  const watchDuration = watch('durationMinutes')

  const onStep1 = handleSubmit(async (data) => {
    const service = await createService.mutateAsync(data).catch(() => null)
    if (service) {
      setServiceId(service.id)
      setStep(2)
    }
  })

  const onStep2 = async () => {
    if (!serviceId) return
    await setWH.mutateAsync(workingHours)
    setStep(3)
  }

  const addQuestion = () => {
    if (!newQ.trim()) return
    setQuestions([...questions, { question: newQ, isRequired: newQRequired }])
    setNewQ('')
    setNewQRequired(false)
  }

  const saveQuestions = async () => {
    if (!serviceId) return
    for (let i = 0; i < questions.length; i++) {
      await addQ.mutateAsync({ ...questions[i], sequence: i })
    }
    router.push('/organiser/services')
  }

  const stepTitles = ['Basic Info', 'Availability', 'Questions']

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/organiser/services')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          Create Service
        </h1>
      </div>

      {/* Steps */}
      <div className="flex gap-2 mb-8">
        {stepTitles.map((t, i) => (
          <div key={t} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: step > i + 1 ? '#00d4aa' : step === i + 1 ? 'var(--brand-accent)' : 'var(--surface-3)', color: 'white' }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="text-sm font-medium" style={{ color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t}</span>
            </div>
            {i < stepTitles.length - 1 && <div className="flex-1 h-px w-8" style={{ background: 'var(--border-color)' }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={onStep1} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Service Name *</label>
            <input {...register('name')} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} placeholder="e.g. Dental Checkup" />
            {errors.name && <p className="text-xs mt-1 text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea {...register('description')} rows={3} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button type="button" key={d} onClick={() => setValue('durationMinutes', d)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={watchDuration === d ? { background: 'var(--brand-accent)', color: 'white' } : { border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
            <input {...register('location')} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} placeholder="Address or Online" />
          </div>

          {/* Toggles */}
          {[
            { field: 'requiresManualConfirm' as const, label: 'Require manual confirmation' },
            { field: 'requiresAdvancePayment' as const, label: 'Require advance payment' },
            { field: 'manageCapacity' as const, label: 'Manage capacity (group appointments)' },
          ].map(({ field, label }) => (
            <div key={field} className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <button type="button" onClick={() => setValue(field, !watch(field))}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ background: watch(field) ? 'var(--brand-accent)' : 'var(--surface-3)' }}>
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: watch(field) ? 26 : 4 }} />
              </button>
            </div>
          ))}

          {watchPay && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Payment Amount (₹)</label>
              <input {...register('advancePaymentAmount', { valueAsNumber: true })} type="number" min="1" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
          )}

          <button type="submit" disabled={createService.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand-accent)' }}>
            {createService.isPending ? 'Creating...' : 'Continue →'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Set your weekly availability. Slots will be generated based on these hours.</p>
          <div className="space-y-2">
            {workingHours.map((wh, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => {
                  const updated = [...workingHours]
                  updated[i] = { ...updated[i], isActive: !updated[i].isActive }
                  setWorkingHours(updated)
                }} className="w-10 h-5 rounded-full relative transition-all" style={{ background: wh.isActive ? 'var(--brand-accent)' : 'var(--surface-3)', flexShrink: 0 }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: wh.isActive ? 22 : 2 }} />
                </button>
                <span className="text-sm font-medium w-24" style={{ color: wh.isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>{DAY_NAMES[wh.dayOfWeek]}</span>
                {wh.isActive && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={wh.startTime} onChange={(e) => { const u = [...workingHours]; u[i] = { ...u[i], startTime: e.target.value }; setWorkingHours(u) }}
                      className="px-2 py-1 rounded-lg text-sm outline-none" style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>–</span>
                    <input type="time" value={wh.endTime} onChange={(e) => { const u = [...workingHours]; u[i] = { ...u[i], endTime: e.target.value }; setWorkingHours(u) }}
                      className="px-2 py-1 rounded-lg text-sm outline-none" style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={onStep2} disabled={setWH.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand-accent)' }}>
            {setWH.isPending ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add questions for customers to answer when booking.</p>

          {questions.map((q, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.isRequired ? 'Required' : 'Optional'}</p>
              </div>
              <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input value={newQ} onChange={(e) => setNewQ(e.target.value)}
              placeholder="Question text..." className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            <button type="button" onClick={() => setNewQRequired(!newQRequired)}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={newQRequired ? { background: 'var(--brand-accent)', color: 'white' } : { border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              Required
            </button>
            <button type="button" onClick={addQuestion} className="p-2.5 rounded-xl" style={{ background: 'var(--brand-accent)', color: 'white' }}>
              <Plus size={16} />
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push('/organiser/services')}
              className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              Skip & Finish
            </button>
            <button onClick={saveQuestions} disabled={addQ.isPending}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-accent)' }}>
              {addQ.isPending ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
