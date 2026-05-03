'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import {
  Search, User as UserIcon, Briefcase, Calendar as CalendarIcon,
  Clock, Check, ArrowRight, X, ChevronLeft,
} from 'lucide-react'
import { useMyServices } from '@/hooks/useServices'
import { useCustomers } from '@/hooks/useCustomers'
import { useSlots } from '@/hooks/useSlots'
import { useCreateBooking } from '@/hooks/useBookings'
import { DatePicker } from '@/components/booking/DatePicker'
import { SlotGrid } from '@/components/booking/SlotGrid'
import { useAuthStore } from '@/store/authStore'
import type { AppointmentType, SlotResult } from '@/types'

type Step = 1 | 2 | 3 | 4

const STEP_TITLES: Record<Step, string> = {
  1: 'Pick a service',
  2: 'Choose a customer',
  3: 'Pick date & time',
  4: 'Review & confirm',
}

export default function BookForCustomerPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: services, isLoading: servicesLoading } = useMyServices()
  const createBooking = useCreateBooking()

  const [step, setStep] = useState<Step>(1)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [resourceId, setResourceId] = useState<string | undefined>(undefined)
  const [date, setDate] = useState<Date>(new Date())
  const [slot, setSlot] = useState<SlotResult | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const { data: customers, isLoading: customersLoading } = useCustomers(debouncedSearch || undefined)

  const publishedServices = useMemo(
    () => (services ?? []).filter((s) => s.isPublished),
    [services]
  )

  const service: AppointmentType | undefined = publishedServices.find((s) => s.id === serviceId)
  const customer = customers?.find((c) => c.id === customerId)
  const dateStr = format(date, 'yyyy-MM-dd')
  const { data: slotsData, isLoading: slotsLoading } = useSlots(serviceId ?? '', dateStr, resourceId)

  const canSubmit = !!service && !!customer && !!slot

  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      const booking = await createBooking.mutateAsync({
        appointmentTypeId: service!.id,
        scheduledStart: slot!.startTime,
        resourceId,
        customerId: customer!.id,
        capacity: 1,
        answers: [],
      })
      router.push(`/organiser/bookings?highlight=${booking.id}`)
    } catch {
      // toast handled by hook
    }
  }

  const reset = () => {
    setStep(1); setServiceId(null); setCustomerId(null); setResourceId(undefined); setSlot(null); setSearch('')
  }

  // Guard: if logged in as customer somehow, bounce away
  useEffect(() => {
    if (user && user.role === 'CUSTOMER') router.replace('/')
  }, [user, router])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-sm font-medium inline-flex items-center gap-1 mb-3" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={14} /> Back
        </button>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Book on behalf of a customer
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Select one of your services, find a customer, pick a slot. They'll receive the booking under their account.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 md:gap-3 flex-wrap">
        {([1, 2, 3, 4] as Step[]).map((n) => {
          const active = step === n
          const done = step > n
          return (
            <div key={n} className="flex items-center gap-1 md:gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium"
                style={done
                  ? { background: 'rgba(16,185,129,0.12)', color: '#047857' }
                  : active
                  ? { background: 'var(--brand-accent)', color: 'white' }
                  : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {done ? <Check size={11} /> : n}
                </span>
                <span>{STEP_TITLES[n]}</span>
              </div>
              {n < 4 && <span style={{ color: 'var(--border-color)' }}>→</span>}
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div className="card-soft p-6" style={{ border: '1px solid var(--border-color)' }}>
        {/* Step 1: Service */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Choose one of your services
            </h2>
            {servicesLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : !publishedServices.length ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                You don't have any published services yet. <button onClick={() => router.push('/organiser/services/new')} className="font-medium" style={{ color: 'var(--brand-accent)' }}>Create one →</button>
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {publishedServices.map((s) => {
                  const accent = s.category?.color || '#0f766e'
                  return (
                    <motion.button
                      key={s.id}
                      whileHover={{ y: -2 }}
                      onClick={() => {
                        setServiceId(s.id)
                        setResourceId(undefined)
                        setSlot(null)
                        setStep(2)
                      }}
                      className="text-left p-4 rounded-xl transition-all"
                      style={serviceId === s.id
                        ? { border: `2px solid ${accent}`, background: `${accent}0d` }
                        : { border: '1px solid var(--border-color)', background: 'white' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}1a`, color: accent }}>
                          <Briefcase size={14} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.durationMinutes} min · {s.category?.name ?? 'Uncategorised'}
                        {s.requiresAdvancePayment && s.advancePaymentAmount ? ` · ₹${Number(s.advancePaymentAmount).toLocaleString('en-IN')}` : ''}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Customer */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Choose a customer
              </h2>
              <button onClick={() => setStep(1)} className="text-xs font-medium" style={{ color: 'var(--brand-accent)' }}>
                Change service
              </button>
            </div>

            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone…"
                className="input-base pl-9"
                autoFocus
              />
            </div>

            {customersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : !customers?.length ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                No customers found{debouncedSearch ? ` for "${debouncedSearch}"` : ''}.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomerId(c.id)
                      setStep(3)
                    }}
                    className="text-left p-3 rounded-xl transition-all flex items-center gap-3"
                    style={customerId === c.id
                      ? { border: '2px solid var(--brand-accent)', background: 'var(--brand-accent-soft)' }
                      : { border: '1px solid var(--border-color)', background: 'white' }}
                    onMouseEnter={(e) => { if (customerId !== c.id) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { if (customerId !== c.id) e.currentTarget.style.background = 'white' }}
                  >
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--brand-accent)', color: 'white' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date / slot / provider */}
        {step === 3 && service && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Pick a slot</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {service.name} · for {customer?.name}
                </p>
              </div>
              <button onClick={() => setStep(2)} className="text-xs font-medium" style={{ color: 'var(--brand-accent)' }}>
                Change customer
              </button>
            </div>

            {/* Provider picker if multiple */}
            {service.resources && service.resources.filter((r) => r.isActive).length > 1 && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Provider</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setResourceId(undefined); setSlot(null) }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={!resourceId
                      ? { background: 'var(--brand-accent)', color: 'white' }
                      : { border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)' }}>
                    Any available
                  </button>
                  {service.resources.filter((r) => r.isActive).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setResourceId(r.id); setSlot(null) }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={resourceId === r.id
                        ? { background: 'var(--brand-accent)', color: 'white' }
                        : { border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)' }}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Date</p>
                <DatePicker selectedDate={date} onSelect={(d) => { setDate(d); setSlot(null) }} />
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Available slots — {format(date, 'EEE, MMM d')}
                </p>
                <SlotGrid
                  slots={slotsData?.slots ?? []}
                  selectedSlot={slot?.startTime?.toString() ?? null}
                  onSelect={setSlot}
                  isLoading={slotsLoading}
                  message={slotsData?.message}
                  date={dateStr}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(4)}
                disabled={!slot}
                className="btn-primary disabled:opacity-50"
              >
                Review booking <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && service && customer && slot && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Review & confirm</h2>
            <div className="space-y-3 mb-6">
              <Row icon={<Briefcase size={14} />} label="Service" value={service.name} />
              <Row icon={<UserIcon size={14} />} label="Customer" value={`${customer.name} · ${customer.email}`} />
              <Row icon={<CalendarIcon size={14} />} label="Date" value={format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')} />
              <Row icon={<Clock size={14} />} label="Time" value={`${format(new Date(slot.startTime), 'h:mm a')} – ${format(new Date(slot.endTime), 'h:mm a')}`} />
              {resourceId && service.resources && (
                <Row icon={<UserIcon size={14} />} label="Provider" value={service.resources.find((r) => r.id === resourceId)?.name ?? '—'} />
              )}
              {service.requiresAdvancePayment && service.advancePaymentAmount && (
                <Row icon={<Check size={14} />} label="Payment" value={`₹${Number(service.advancePaymentAmount).toLocaleString('en-IN')} marked PAID on confirmation`} />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={reset} className="btn-ghost">
                <X size={14} /> Start over
              </button>
              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="btn-ghost">Edit slot</button>
                <button
                  onClick={handleSubmit}
                  disabled={createBooking.isPending}
                  className="btn-primary disabled:opacity-50"
                >
                  {createBooking.isPending ? 'Creating…' : (
                    <>Create booking <Check size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'white', color: 'var(--brand-accent)', border: '1px solid var(--border-color)' }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}
