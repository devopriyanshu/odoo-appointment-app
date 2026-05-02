'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, CreditCard, Smartphone } from 'lucide-react'
import { useService } from '@/hooks/useServices'
import { useCreateBooking } from '@/hooks/useBookings'
import type { BookingQuestion } from '@/types'

function ConfirmPageInner() {
  const params = useSearchParams()
  const router = useRouter()
  const serviceId = params.get('serviceId') || ''
  const scheduledStart = params.get('scheduledStart') || ''
  const resourceId = params.get('resourceId') || undefined

  const { data: service, isLoading } = useService(serviceId)
  const createBooking = useCreateBooking()
  const [paymentStep, setPaymentStep] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [confirmedBookingId, setConfirmedBookingId] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm()

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} /></div>
  if (!service) return null

  const questions: BookingQuestion[] = service.bookingQuestions || []
  const requiresPayment = service.requiresAdvancePayment
  const paymentAmount = Number(service.advancePaymentAmount || 0)
  const gst = Math.round(paymentAmount * 0.18)
  const total = paymentAmount + gst

  const onSubmit = async (data: Record<string, string>) => {
    const answers = questions.map((q) => ({
      questionId: q.id,
      answer: data[q.id] || '',
    }))

    if (requiresPayment && !paymentRef) {
      setPaymentStep(true)
      return
    }

    const booking = await createBooking.mutateAsync({
      appointmentTypeId: serviceId,
      resourceId,
      scheduledStart,
      capacity: 1,
      answers,
      paymentReference: paymentRef || undefined,
    }).catch(() => null)

    if (booking) {
      router.push(`/appointments/${booking.id}?confirmed=1`)
    }
  }

  const handleMockPayment = () => {
    setPaymentProcessing(true)
    setTimeout(() => {
      const ref = `TXN${Date.now()}`
      setPaymentRef(ref)
      setPaymentProcessing(false)
      setPaymentStep(false)
      handleSubmit(onSubmit)()
    }, 1500)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          {paymentStep ? 'Complete Payment' : 'Confirm Booking'}
        </h1>
      </div>

      {/* Booking summary */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-semibold mb-3" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          {service.name}
        </h3>
        <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>{format(new Date(scheduledStart), 'EEEE, MMMM d, yyyy')}</p>
          <p>{format(new Date(scheduledStart), 'h:mm a')} · {service.durationMinutes} min</p>
          {service.location && <p>{service.location}</p>}
        </div>
      </div>

      {!paymentStep ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {questions.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
              <h3 className="font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>Details</h3>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
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
            </div>
          )}

          <button type="submit" disabled={createBooking.isPending}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand-accent)' }}>
            {createBooking.isPending ? 'Booking...' : requiresPayment ? `Proceed to Payment (₹${total})` : 'Confirm Booking'}
          </button>
        </form>
      ) : (
        /* Payment screen */
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Service</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>₹{paymentAmount}</span>
          </div>
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>GST (18%)</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>₹{gst}</span>
          </div>
          <div className="flex items-center justify-between mb-6">
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{total}</span>
          </div>

          <div className="mb-4 p-3 rounded-lg text-center text-xs" style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--text-muted)' }}>
            🔒 This is a demo payment. No real charges will be made.
          </div>

          <button
            onClick={handleMockPayment}
            disabled={paymentProcessing}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand-accent)' }}
          >
            <CreditCard size={16} />
            {paymentProcessing ? 'Processing...' : `Pay ₹${total}`}
          </button>

          <button onClick={() => setPaymentStep(false)} className="w-full py-2 mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Back
          </button>
        </div>
      )}
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} /></div>}>
      <ConfirmPageInner />
    </Suspense>
  )
}
