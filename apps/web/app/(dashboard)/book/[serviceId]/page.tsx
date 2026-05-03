'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { useService } from '@/hooks/useServices'
import { useSlots } from '@/hooks/useSlots'
import { useCreateBooking } from '@/hooks/useBookings'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/store/authStore'
import { DatePicker } from '@/components/booking/DatePicker'
import { SlotGrid } from '@/components/booking/SlotGrid'
import { CapacitySelector } from '@/components/booking/CapacitySelector'
import { PaymentScreen } from '@/components/booking/PaymentScreen'
import { useForm } from 'react-hook-form'
import type { SlotResult, Resource, BookingQuestion } from '@/types'

type Step = 'datetime' | 'capacity' | 'questions' | 'payment'

const STEPS: { key: Step; label: string }[] = [
  { key: 'datetime', label: 'Date & Time' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'questions', label: 'Details' },
  { key: 'payment', label: 'Payment' },
]

export default function BookServicePage({ params }: { params: { serviceId: string } }) {
  const { serviceId } = params
  const router = useRouter()
  const { data: service, isLoading } = useService(serviceId)
  const createBooking = useCreateBooking()

  const { user } = useAuthStore()
  // Organisers (and admins) book customers via the dedicated /organiser/book-for-customer
  // flow which restricts to their own services. The public /book/[serviceId] route is
  // for customers only.
  useEffect(() => {
    if (user?.role === 'ORGANISER' || user?.role === 'ADMIN') {
      router.replace('/organiser/book-for-customer')
    }
  }, [user?.role, router])
  const isOrganiser = false
  const { data: usersData } = useUsers({ enabled: isOrganiser })

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null)
  const [capacity, setCapacity] = useState(1)
  const [paymentRef, setPaymentRef] = useState('')
  const [step, setStep] = useState<Step>('datetime')

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: slotsData, isLoading: slotsLoading } = useSlots(serviceId, dateStr, selectedResource?.id)

  const { register, handleSubmit, formState: { errors } } = useForm()

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!service) return null

  const questions: BookingQuestion[] = service.bookingQuestions ?? []
  const hasCapacity = service.manageCapacity && (service.maxCapacityPerSlot ?? 1) > 1
  const requiresPayment = service.requiresAdvancePayment

  // Compute visible steps
  const visibleSteps = STEPS.filter(s => {
    if (s.key === 'capacity') return hasCapacity
    if (s.key === 'questions') return questions.length > 0
    if (s.key === 'payment') return requiresPayment
    return true
  })
  const stepIndex = visibleSteps.findIndex(s => s.key === step)

  const goNext = () => {
    if (step === 'datetime' && isOrganiser && !selectedCustomerId) {
      toast.error('Please select a customer to book on behalf of')
      return
    }
    const next = visibleSteps[stepIndex + 1]
    if (next) setStep(next.key)
  }
  const goPrev = () => {
    const prev = visibleSteps[stepIndex - 1]
    if (prev) setStep(prev.key)
    else router.push('/')
  }

  const onSubmit = async (data: Record<string, string>) => {
    const answers = questions.map(q => ({ questionId: q.id, answer: data[q.id] || '' }))
    const booking = await createBooking.mutateAsync({
      appointmentTypeId: serviceId,
      resourceId: selectedResource?.id,
      scheduledStart: selectedSlot!.startTime.toString(),
      capacity,
      answers,
      paymentReference: paymentRef || undefined,
      customerId: selectedCustomerId || undefined,
    }).catch(() => null)
    if (booking) router.push(`/appointments/${booking.id}?confirmed=1`)
  }

  const maxCap = Math.min(
    (selectedSlot?.availableCapacity ?? service.maxCapacityPerSlot ?? 1),
    10
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goPrev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>{service.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{service.durationMinutes} min{service.location ? ` · ${service.location}` : ''}</p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {visibleSteps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                style={i <= stepIndex
                  ? { background: 'var(--brand-accent)', color: 'white' }
                  : { background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                }>{i + 1}</div>
              <span className="text-xs font-medium whitespace-nowrap hidden sm:block"
                style={{ color: i === stepIndex ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div className="h-px w-8 flex-shrink-0" style={{ background: i < stepIndex ? 'var(--brand-accent)' : 'var(--border-color)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Customer selector (if organiser) */}
      {isOrganiser && step === 'datetime' && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Book on behalf of</h2>
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full max-w-sm px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            <option value="">Select a customer</option>
            {usersData?.users?.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          {(!usersData?.users || usersData.users.length === 0) && (
            <p className="text-xs text-red-500 mt-1">No customers found or still loading...</p>
          )}
        </div>
      )}

      {/* Provider selector (if multiple) */}
      {service.resources && service.resources.length > 1 && step === 'datetime' && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Select Provider</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedResource(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border"
              style={!selectedResource ? { background: 'var(--brand-accent)', borderColor: 'var(--brand-accent)', color: 'white' } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <User size={13} /> Any Available
            </button>
            {service.resources.map((r: Resource) => (
              <button key={r.id} onClick={() => setSelectedResource(r)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border"
                style={selectedResource?.id === r.id ? { background: 'var(--brand-accent)', borderColor: 'var(--brand-accent)', color: 'white' } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--brand-accent-2)' }}>{r.name[0]}</div>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Date & Time */}
      {step === 'datetime' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Select Date</h2>
            <DatePicker selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null) }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              {`Available on ${format(selectedDate, 'EEE, MMM d')}`}
            </h2>
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', minHeight: 200 }}>
              <SlotGrid slots={slotsData?.slots || []} selectedSlot={selectedSlot?.startTime?.toString() || null}
                onSelect={setSelectedSlot} isLoading={slotsLoading} message={slotsData?.message} date={dateStr} />
            </div>
          </div>
        </div>
      )}

      {/* Step: Capacity */}
      {step === 'capacity' && (
        <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <h2 className="text-lg font-bold mb-6" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>How many spots do you need?</h2>
          <CapacitySelector value={capacity} onChange={setCapacity} max={maxCap} />
        </div>
      )}

      {/* Step: Questions */}
      {step === 'questions' && (
        <form id="questions-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-base font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>A few quick questions</h2>
            {questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {q.question} {q.isRequired && <span className="text-red-400">*</span>}
                </label>
                <input
                  {...register(q.id, { required: q.isRequired ? 'This field is required' : false })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder={q.isRequired ? 'Required' : 'Optional'}
                />
                {errors[q.id] && <p className="text-xs mt-1 text-red-400">{String(errors[q.id]?.message)}</p>}
              </div>
            ))}
          </div>
        </form>
      )}

      {/* Step: Payment */}
      {step === 'payment' && (
        <PaymentScreen
          amount={Number(service.advancePaymentAmount ?? 0)}
          serviceName={service.name}
          onSuccess={(ref) => { setPaymentRef(ref); handleSubmit(onSubmit)() }}
        />
      )}

      {/* Sticky bottom bar */}
      {selectedSlot && (
        <div className="mt-6 flex items-center justify-between rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--brand-accent)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {format(selectedDate, 'EEEE, MMM d')} · {format(new Date(selectedSlot.startTime), 'h:mm a')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {capacity} spot{capacity > 1 ? 's' : ''}{selectedResource ? ` · ${selectedResource.name}` : ''}
            </p>
          </div>
          {step !== 'payment' && step !== 'questions' && (
            <button
              disabled={!selectedSlot || createBooking.isPending}
              onClick={stepIndex === visibleSteps.length - 1 ? handleSubmit(onSubmit) : goNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--brand-accent)' }}
            >
              {createBooking.isPending ? 'Booking...' : stepIndex === visibleSteps.length - 1 ? 'Confirm Booking' : <>Continue <ChevronRight size={16} /></>}
            </button>
          )}
          {step === 'questions' && (
            <button
              form="questions-form"
              type={requiresPayment ? 'button' : 'submit'}
              onClick={requiresPayment ? goNext : undefined}
              disabled={createBooking.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--brand-accent)' }}
            >
              {createBooking.isPending ? 'Booking...' : requiresPayment ? <>Pay ₹{Number(service.advancePaymentAmount ?? 0)} <ChevronRight size={16} /></> : 'Confirm Booking'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
