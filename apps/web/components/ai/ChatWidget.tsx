'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Calendar, Clock, Check, ArrowRight, Mic, Loader2 } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useServices } from '@/hooks/useServices'
import { useCreateBooking } from '@/hooks/useBookings'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { toast } from 'sonner'
import api from '@/lib/api'
import { extractIntent } from '@/lib/bookingNLP'
import type { SlotResult } from '@/types'

type ChatTurn =
  | { kind: 'bot'; text: string; options?: Option[] }
  | { kind: 'user'; text: string }
  | { kind: 'confirm'; draft: Required<Pick<Draft, 'serviceId' | 'serviceName' | 'date' | 'slotStart' | 'slotEnd'>> & { resourceId?: string } }
  | { kind: 'booked'; bookingId: string; code: string }

interface Option {
  label: string
  value: string
  hint?: string
}

interface Draft {
  serviceId?: string
  serviceName?: string
  date?: string // YYYY-MM-DD
  slotStart?: string // ISO
  slotEnd?: string // ISO
  resourceId?: string
}

type Step = 'service' | 'resource' | 'date' | 'slot' | 'confirm' | 'done'

function nextMissing(draft: Draft, service?: { resources?: { id: string; name: string; isActive: boolean }[] }): Step {
  if (!draft.serviceId) return 'service'
  const activeResources = (service?.resources ?? []).filter((r) => r.isActive)
  if (activeResources.length > 1 && !draft.resourceId && draft.resourceId !== 'any') return 'resource'
  if (!draft.date) return 'date'
  if (!draft.slotStart) return 'slot'
  return 'confirm'
}

export function ChatWidget() {
  const { chatOpen, toggleChat, openChat } = useUIStore()
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const handler = () => openChat?.()
    window.addEventListener('open-chat', handler)
    return () => window.removeEventListener('open-chat', handler)
  }, [openChat])

  // Only customers see this widget
  if (!user || user.role !== 'CUSTOMER') return null

  return (
    <>
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white"
        style={{ background: 'var(--brand-accent)' }}
        aria-label="Booking assistant"
      >
        {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {chatOpen && <ChatPanel onClose={toggleChat} onBooked={(id) => router.push(`/appointments/${id}?confirmed=1`)} />}
      </AnimatePresence>
    </>
  )
}

function ChatPanel({ onClose, onBooked }: { onClose: () => void; onBooked: (id: string) => void }) {
  const { data: services } = useServices()
  const createBooking = useCreateBooking()
  const publishedServices = useMemo(() => (services ?? []).filter((s) => s.isPublished), [services])

  const [draft, setDraft] = useState<Draft>({})
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  // Initial greeting once services load
  useEffect(() => {
    if (initRef.current || !publishedServices.length) return
    initRef.current = true
    setTurns([
      {
        kind: 'bot',
        text: "Hi! 👋 I can help you book an appointment. Which service would you like to book?",
        options: publishedServices.slice(0, 6).map((s) => ({
          label: s.name,
          value: `service:${s.id}`,
          hint: `${s.durationMinutes} min`,
        })),
      },
    ])
  }, [publishedServices])

  // Helpers to push turns
  const pushBot = (text: string, options?: Option[]) =>
    setTurns((t) => [...t, { kind: 'bot', text, options }])
  const pushUser = (text: string) => setTurns((t) => [...t, { kind: 'user', text }])

  // After updating draft, ask for next missing piece
  const advance = async (newDraft: Draft) => {
    const service = publishedServices.find((s) => s.id === newDraft.serviceId)
    const step = nextMissing(newDraft, service)
    if (step === 'service') {
      pushBot('Which service would you like to book?', publishedServices.slice(0, 6).map((s) => ({
        label: s.name, value: `service:${s.id}`, hint: `${s.durationMinutes} min`,
      })))
      return
    }
    if (step === 'resource') {
      const activeResources = (service?.resources ?? []).filter((r) => r.isActive)
      const opts: Option[] = [
        { label: 'Any available', value: 'resource:any' },
        ...activeResources.map((r) => ({ label: r.name, value: `resource:${r.id}` })),
      ]
      pushBot(`Which provider would you prefer for ${newDraft.serviceName}?`, opts)
      return
    }
    if (step === 'date') {
      const today = new Date()
      const opts: Option[] = []
      for (let i = 0; i < 7; i++) {
        const d = addDays(today, i)
        opts.push({
          label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE, MMM d'),
          value: `date:${format(d, 'yyyy-MM-dd')}`,
        })
      }
      pushBot(`Got it — ${newDraft.serviceName}. Which date works for you?`, opts)
      return
    }
    if (step === 'slot') {
      pushBot(`Looking up available slots for ${format(parseISO(newDraft.date!), 'EEE, MMM d')}…`)
      setBusy(true)
      try {
        const res = await api.get('/slots/available', {
          params: {
            serviceId: newDraft.serviceId,
            date: newDraft.date,
            ...(newDraft.resourceId && newDraft.resourceId !== 'any' ? { resourceId: newDraft.resourceId } : {}),
          },
        })
        const slots: SlotResult[] = res.data.slots ?? []
        if (!slots.length) {
          pushBot(
            res.data.message || 'No slots available on that date. Pick another date?',
            (() => {
              const today = new Date()
              return Array.from({ length: 7 }, (_, i) => {
                const d = addDays(today, i + 1)
                return { label: format(d, 'EEE, MMM d'), value: `date:${format(d, 'yyyy-MM-dd')}` }
              })
            })()
          )
          // Reset date so user picks again
          setDraft((d) => ({ ...d, date: undefined }))
          return
        }
        const opts: Option[] = slots.slice(0, 12).map((s) => ({
          label: format(new Date(s.startTime), 'h:mm a'),
          value: `slot:${s.startTime}|${s.endTime}`,
          hint: s.availableCapacity > 1 ? `${s.availableCapacity} left` : undefined,
        }))
        pushBot(`Here are the available times. Pick one:`, opts)
      } catch {
        pushBot('Could not load slots. Please try again.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (step === 'confirm') {
      setTurns((t) => [
        ...t,
        {
          kind: 'confirm',
          draft: {
            serviceId: newDraft.serviceId!,
            serviceName: newDraft.serviceName!,
            date: newDraft.date!,
            slotStart: newDraft.slotStart!,
            slotEnd: newDraft.slotEnd!,
            resourceId: newDraft.resourceId,
          },
        },
      ])
    }
  }

  const handleOption = async (opt: Option) => {
    // Split only on the FIRST colon — values may contain ':' (ISO timestamps)
    const sep = opt.value.indexOf(':')
    const kind = sep === -1 ? opt.value : opt.value.slice(0, sep)
    const val = sep === -1 ? '' : opt.value.slice(sep + 1)

    if (kind === 'service') {
      const svc = publishedServices.find((s) => s.id === val)
      if (!svc) return
      pushUser(svc.name)
      const updated = { ...draft, serviceId: svc.id, serviceName: svc.name }
      setDraft(updated)
      await advance(updated)
      return
    }
    if (kind === 'resource') {
      const svc = publishedServices.find((s) => s.id === draft.serviceId)
      const resourceId = val === 'any' ? 'any' : val
      const label = val === 'any'
        ? 'Any available'
        : svc?.resources.find((r) => r.id === val)?.name ?? 'Provider'
      pushUser(label)
      const updated = { ...draft, resourceId }
      setDraft(updated)
      await advance(updated)
      return
    }
    if (kind === 'date') {
      pushUser(format(parseISO(val), 'EEE, MMM d'))
      const updated = { ...draft, date: val, slotStart: undefined, slotEnd: undefined }
      setDraft(updated)
      await advance(updated)
      return
    }
    if (kind === 'slot') {
      const pipe = val.indexOf('|')
      const start = pipe === -1 ? val : val.slice(0, pipe)
      const end = pipe === -1 ? val : val.slice(pipe + 1)
      const startDate = new Date(start)
      if (Number.isNaN(startDate.getTime())) return
      pushUser(format(startDate, 'h:mm a'))
      const updated = { ...draft, slotStart: start, slotEnd: end }
      setDraft(updated)
      await advance(updated)
      return
    }
  }

  const handleUserText = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || busy) return
    pushUser(text)

    // Lowercase intent quick-checks
    const lower = text.toLowerCase()
    if (/^(reset|start over|cancel|restart)$/i.test(lower)) {
      setDraft({})
      pushBot('Started over. Which service would you like to book?', publishedServices.slice(0, 6).map((s) => ({
        label: s.name, value: `service:${s.id}`, hint: `${s.durationMinutes} min`,
      })))
      return
    }

    // Extract whatever info we can; do NOT assume missing
    const intent = extractIntent(text, publishedServices)
    const updated: Draft = { ...draft }
    const filled: string[] = []
    const ignored: string[] = []

    if (!updated.serviceId && intent.serviceId) {
      updated.serviceId = intent.serviceId
      updated.serviceName = intent.serviceName
      filled.push(`service: ${intent.serviceName}`)
    }
    if (!updated.date && intent.date) {
      updated.date = intent.date
      filled.push(`date: ${format(parseISO(intent.date), 'EEE, MMM d')}`)
    }

    // For time: only accept if we already have service+date and the requested time matches an actual available slot.
    if (intent.time && updated.serviceId && updated.date && !updated.slotStart) {
      try {
        const res = await api.get('/slots/available', {
          params: { serviceId: updated.serviceId, date: updated.date },
        })
        const slots: SlotResult[] = res.data.slots ?? []
        const wanted = intent.time
        const match = slots.find((s) => format(new Date(s.startTime), 'HH:mm') === wanted)
        if (match) {
          updated.slotStart = match.startTime
          updated.slotEnd = match.endTime
          filled.push(`time: ${format(new Date(match.startTime), 'h:mm a')}`)
        } else {
          ignored.push(`time ${wanted} is not available — please pick from the list`)
        }
      } catch {
        // ignore — will be handled in slot step
      }
    } else if (intent.time && (!updated.serviceId || !updated.date)) {
      ignored.push("I'll show times after we pick a service and date")
    }

    setDraft(updated)

    // Acknowledge what we extracted (don't fabricate)
    if (filled.length) {
      pushBot(`Got ${filled.join(', ')}.${ignored.length ? ' Note: ' + ignored.join('; ') + '.' : ''}`)
    } else if (ignored.length) {
      pushBot(ignored.join('; '))
    } else {
      // Could not extract — be explicit
      const missing = nextMissing(updated)
      const friendly =
        missing === 'service' ? "I couldn't match a service. Please pick one below."
        : missing === 'date' ? "I couldn't pick a date from that. Please choose one below."
        : missing === 'slot' ? "Please pick an available time from the list."
        : 'Got it.'
      pushBot(friendly)
    }

    await advance(updated)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    await handleUserText(text)
  }

  // Voice input ----------------------------------------------------
  const { isRecording, startRecording, stopRecording, error: micError } = useVoiceRecorder()
  const [transcribing, setTranscribing] = useState(false)
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN'>('en-IN')

  useEffect(() => {
    if (micError) toast.error(micError)
  }, [micError])

  const handleMicPress = async () => {
    if (busy || transcribing) return
    await startRecording()
  }

  const handleMicRelease = async () => {
    if (!isRecording) return
    const blob = await stopRecording()
    if (!blob || blob.size === 0) return
    setTranscribing(true)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'audio.webm')
      fd.append('languageCode', voiceLang)
      const res = await api.post('/ai/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const transcript: string = res.data?.transcript ?? ''
      if (!transcript.trim()) {
        toast.error("Couldn't hear that — please try again.")
        return
      }
      await handleUserText(transcript)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Voice input failed. AI service may not be configured.'
      toast.error(msg)
    } finally {
      setTranscribing(false)
    }
  }

  const handleConfirm = async (turn: Extract<ChatTurn, { kind: 'confirm' }>) => {
    setBusy(true)
    try {
      const booking = await createBooking.mutateAsync({
        appointmentTypeId: turn.draft.serviceId,
        scheduledStart: turn.draft.slotStart,
        resourceId: turn.draft.resourceId && turn.draft.resourceId !== 'any' ? turn.draft.resourceId : undefined,
        capacity: 1,
        answers: [],
      })
      setTurns((t) => [...t, { kind: 'booked', bookingId: booking.id, code: booking.confirmationCode }])
    } catch {
      // toast handled by hook
    } finally {
      setBusy(false)
    }
  }

  const handleEdit = (field: 'service' | 'resource' | 'date' | 'slot') => {
    const updated = { ...draft }
    if (field === 'service') { updated.serviceId = undefined; updated.serviceName = undefined; updated.resourceId = undefined; updated.date = undefined; updated.slotStart = undefined; updated.slotEnd = undefined }
    if (field === 'resource') { updated.resourceId = undefined; updated.slotStart = undefined; updated.slotEnd = undefined }
    if (field === 'date') { updated.date = undefined; updated.slotStart = undefined; updated.slotEnd = undefined }
    if (field === 'slot') { updated.slotStart = undefined; updated.slotEnd = undefined }
    setDraft(updated)
    pushUser(`Change ${field}`)
    advance(updated)
  }

  const currentService = publishedServices.find((s) => s.id === draft.serviceId)
  const currentResourceName = draft.resourceId === 'any'
    ? 'Any provider'
    : currentService?.resources.find((r) => r.id === draft.resourceId)?.name

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.85, opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      style={{ height: 560, background: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand-accent)' }}>AI</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Booking Assistant</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quick guided booking</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface-3)]" style={{ color: 'var(--text-muted)' }}>
          <X size={14} />
        </button>
      </div>

      {/* Draft summary chip */}
      {(draft.serviceName || draft.resourceId || draft.date || draft.slotStart) && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5 text-xs border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-2)' }}>
          {draft.serviceName && (
            <button onClick={() => handleEdit('service')} className="px-2 py-1 rounded-md flex items-center gap-1 hover:opacity-80" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--brand-accent)' }}>
              {draft.serviceName} <X size={10} />
            </button>
          )}
          {currentResourceName && (
            <button onClick={() => handleEdit('resource')} className="px-2 py-1 rounded-md flex items-center gap-1 hover:opacity-80" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--brand-accent)' }}>
              {currentResourceName} <X size={10} />
            </button>
          )}
          {draft.date && (
            <button onClick={() => handleEdit('date')} className="px-2 py-1 rounded-md flex items-center gap-1 hover:opacity-80" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--brand-accent)' }}>
              <Calendar size={10} /> {format(parseISO(draft.date), 'MMM d')} <X size={10} />
            </button>
          )}
          {draft.slotStart && (
            <button onClick={() => handleEdit('slot')} className="px-2 py-1 rounded-md flex items-center gap-1 hover:opacity-80" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--brand-accent)' }}>
              <Clock size={10} /> {format(new Date(draft.slotStart), 'h:mm a')} <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {turns.map((t, i) => {
          if (t.kind === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="px-3 py-2 rounded-xl rounded-tr-sm max-w-[260px] text-sm" style={{ background: 'var(--brand-accent)', color: 'white' }}>
                  {t.text}
                </div>
              </div>
            )
          }
          if (t.kind === 'bot') {
            return (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--brand-accent)' }}>AI</div>
                <div className="flex-1">
                  <div className="px-3 py-2 rounded-xl rounded-tl-sm text-sm inline-block max-w-[280px]" style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}>
                    {t.text}
                  </div>
                  {t.options && t.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.options.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => handleOption(o)}
                          disabled={busy}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                          style={{ border: '1px solid var(--brand-accent)', color: 'var(--brand-accent)', background: 'transparent' }}
                        >
                          {o.label}{o.hint && <span className="opacity-60 ml-1">· {o.hint}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          if (t.kind === 'confirm') {
            return (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--brand-accent)' }}>AI</div>
                <div className="flex-1 rounded-xl p-3 text-sm" style={{ background: 'var(--surface-3)', border: '1px solid var(--brand-accent)' }}>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Confirm your booking</p>
                  <div className="space-y-1 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Service:</span> {t.draft.serviceName}</div>
                    {(() => {
                      const svc = publishedServices.find((s) => s.id === t.draft.serviceId)
                      const name = t.draft.resourceId === 'any'
                        ? 'Any available'
                        : svc?.resources.find((r) => r.id === t.draft.resourceId)?.name
                      return name ? <div><span style={{ color: 'var(--text-muted)' }}>Provider:</span> {name}</div> : null
                    })()}
                    <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> {format(parseISO(t.draft.date), 'EEE, MMM d, yyyy')}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Time:</span> {format(new Date(t.draft.slotStart), 'h:mm a')} – {format(new Date(t.draft.slotEnd), 'h:mm a')}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(t)}
                      disabled={busy || createBooking.isPending}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                      style={{ background: 'var(--brand-accent)' }}
                    >
                      <Check size={12} /> {createBooking.isPending ? 'Booking…' : 'Confirm Booking'}
                    </button>
                    <button
                      onClick={() => handleEdit('slot')}
                      disabled={busy}
                      className="px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            )
          }
          if (t.kind === 'booked') {
            return (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px]" style={{ background: '#00d4aa' }}>
                  <Check size={14} />
                </div>
                <div className="flex-1 rounded-xl p-3 text-sm" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)' }}>
                  <p className="font-semibold mb-1" style={{ color: '#00d4aa' }}>Booking confirmed!</p>
                  <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{t.code.slice(0, 12)}</p>
                  <button
                    onClick={() => onBooked(t.bookingId)}
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    View details <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )
          }
          return null
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice status banner */}
      {(isRecording || transcribing) && (
        <div className="px-4 py-2 text-xs flex items-center justify-center gap-2" style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--brand-accent)', borderTop: '1px solid var(--border-color)' }}>
          {isRecording ? (
            <>
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2 h-2 rounded-full"
                style={{ background: '#ff4d6d' }}
              />
              Listening… release to send
            </>
          ) : (
            <>
              <Loader2 size={12} className="animate-spin" /> Transcribing…
            </>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
        <select
          value={voiceLang}
          onChange={(e) => setVoiceLang(e.target.value as 'en-IN' | 'hi-IN')}
          className="px-2 py-2 rounded-xl text-xs outline-none cursor-pointer"
          style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          title="Voice input language"
          disabled={busy || isRecording || transcribing}
        >
          <option value="en-IN">EN</option>
          <option value="hi-IN">हिं</option>
        </select>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? 'Listening…' : 'Type or hold mic to speak…'}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          disabled={busy || isRecording || transcribing}
        />
        <motion.button
          type="button"
          onPointerDown={handleMicPress}
          onPointerUp={handleMicRelease}
          onPointerLeave={() => { if (isRecording) handleMicRelease() }}
          disabled={busy || transcribing}
          animate={isRecording ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={isRecording ? { repeat: Infinity, duration: 1 } : {}}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50 select-none"
          style={{ background: isRecording ? '#ff4d6d' : 'var(--surface-3)', color: isRecording ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          aria-label="Hold to speak"
        >
          {transcribing ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
        </motion.button>
        <button
          type="submit"
          disabled={busy || !input.trim() || isRecording || transcribing}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
          style={{ background: 'var(--brand-accent)' }}
        >
          <Send size={14} />
        </button>
      </form>
    </motion.div>
  )
}
