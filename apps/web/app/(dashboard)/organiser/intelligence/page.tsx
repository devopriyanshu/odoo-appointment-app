'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, TrendingUp, TrendingDown, Download, X,
  IndianRupee, Users, CalendarCheck, AlertTriangle, BarChart3, Loader2,
} from 'lucide-react'
import { useHeadlineKPIs, useRunQuery, type ReportResult, type QuerySpec } from '@/hooks/useIntelligence'
import { ReportChart } from '@/components/intelligence/ReportChart'
import { toast } from 'sonner'

function specKey(spec: QuerySpec): string {
  const normalized = {
    metric: spec.metric,
    groupBy: spec.groupBy ?? null,
    from: spec.from ?? null,
    to: spec.to ?? null,
    limit: spec.limit ?? null,
    chartHint: spec.chartHint ?? null,
    serviceIds: [...(spec.filters?.serviceIds ?? [])].sort(),
    categoryIds: [...(spec.filters?.categoryIds ?? [])].sort(),
    status: [...(spec.filters?.status ?? [])].sort(),
  }
  return JSON.stringify(normalized)
}

const QUICK_REPORTS: Array<{ label: string; spec: QuerySpec }> = [
  { label: 'Revenue trend (30d)', spec: { metric: 'revenue', groupBy: 'day' } },
  { label: 'Bookings by service', spec: { metric: 'bookings', groupBy: 'service' } },
  { label: 'Peak hours', spec: { metric: 'bookings', groupBy: 'hour' } },
  { label: 'No-show rate by service', spec: { metric: 'noShowRate', groupBy: 'service' } },
  { label: 'Top customers', spec: { metric: 'bookings', groupBy: 'customer', limit: 10 } },
  { label: 'Status mix', spec: { metric: 'bookings', groupBy: 'status', chartHint: 'pie' } },
  { label: 'Provider workload', spec: { metric: 'bookings', groupBy: 'provider' } },
  { label: 'Day-of-week pattern', spec: { metric: 'bookings', groupBy: 'dayOfWeek' } },
]

const KPI_ICONS: Record<string, typeof IndianRupee> = {
  Revenue: IndianRupee,
  Bookings: CalendarCheck,
  Customers: Users,
  'No-show rate': AlertTriangle,
}

interface ChatTurn {
  kind: 'user' | 'bot' | 'report'
  text?: string
  report?: ReportResult
}

export default function IntelligencePage() {
  const { data: kpis, isLoading: kpisLoading } = useHeadlineKPIs()
  const runQuery = useRunQuery()
  const [turns, setTurns] = useState<ChatTurn[]>([
    { kind: 'bot', text: "Hi! I'm your business intelligence assistant. Ask me things like \"revenue last 30 days\" or \"bookings by service\" — or click a quick report below." },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  /** Insert a report, but if its spec already exists in the canvas,
   *  refresh in place and bring it to the top instead of duplicating. */
  const upsertReport = (report: ReportResult) => {
    const key = specKey(report.spec)
    setTurns((t) => {
      const existingIdx = t.findIndex((x) => x.kind === 'report' && x.report && specKey(x.report.spec) === key)
      if (existingIdx >= 0) {
        const next = t.filter((_, i) => i !== existingIdx)
        next.push({ kind: 'report', report })
        return next
      }
      return [...t, { kind: 'report', report }]
    })
  }

  const submitPrompt = async (prompt: string) => {
    if (!prompt.trim() || runQuery.isPending) return
    setTurns((t) => [...t, { kind: 'user', text: prompt }])
    try {
      const report = await runQuery.mutateAsync({ prompt })
      const isDuplicate = turns.some(
        (x) => x.kind === 'report' && x.report && specKey(x.report.spec) === specKey(report.spec)
      )
      if (isDuplicate) toast.info('Refreshed existing report')
      upsertReport(report)
    } catch {
      setTurns((t) => [...t, {
        kind: 'bot',
        text: "I couldn't translate that. Try: \"revenue last 30 days\" or \"top customers\" or \"no-show rate by service\".",
      }])
    }
  }

  const submitSpec = async (spec: QuerySpec, label: string) => {
    if (runQuery.isPending) return
    const key = specKey(spec)
    const existing = turns.find((x) => x.kind === 'report' && x.report && specKey(x.report.spec) === key)
    if (existing && existing.report) {
      // Already on the canvas — just bring it back to the top, skip the round-trip
      toast.info(`"${label}" is already shown — refreshing`)
      setTurns((t) => [...t, { kind: 'user', text: label }])
      try {
        const report = await runQuery.mutateAsync({ spec })
        upsertReport(report)
      } catch {
        // toast handled
      }
      return
    }
    setTurns((t) => [...t, { kind: 'user', text: label }])
    try {
      const report = await runQuery.mutateAsync({ spec })
      upsertReport(report)
    } catch {
      // toast handled
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = input.trim()
    if (!v) return
    setInput('')
    submitPrompt(v)
  }

  const exportCSV = (report: ReportResult) => {
    const rows = [['label', 'value'], ...report.data.map((r) => [r.label, String(r.value)])]
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-2"
            style={{ background: 'rgba(15,118,110,0.1)', color: 'var(--brand-accent)' }}>
            <Sparkles size={12} /> Business Intelligence
          </div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Insights & reports
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Ask questions in plain English — get charts, trends, and exports.
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-soft p-5" style={{ border: '1px solid var(--border-color)' }}>
              <div className="skeleton h-4 w-20 mb-3" />
              <div className="skeleton h-8 w-24 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))
          : (kpis ?? []).map((kpi, i) => {
            const Icon = KPI_ICONS[kpi.summary.label] ?? BarChart3
            const positive = (kpi.summary.delta ?? 0) >= 0
            const goodWhenUp = !['No-show rate', 'Cancellation rate'].includes(kpi.summary.label)
            const isGood = goodWhenUp ? positive : !positive
            return (
              <div key={i} className="card-soft p-5" style={{ border: '1px solid var(--border-color)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{kpi.summary.label}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>
                    <Icon size={14} />
                  </div>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {kpi.summary.value}
                </p>
                {kpi.summary.delta !== undefined && (
                  <div className="inline-flex items-center gap-1 text-xs font-medium"
                    style={{ color: isGood ? '#047857' : '#b91c1c' }}>
                    {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(kpi.summary.delta)}% {kpi.summary.deltaLabel}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* Quick reports */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Quick reports
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_REPORTS.map((q) => (
            <button
              key={q.label}
              onClick={() => submitSpec(q.spec, q.label)}
              disabled={runQuery.isPending}
              className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'white' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.color = 'var(--brand-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace: chat + reports */}
      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Chat panel */}
        <div className="card-soft flex flex-col" style={{ border: '1px solid var(--border-color)', height: 540 }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--brand-accent)' }}>BI</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>BI Assistant</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Powered by Sarvam + heuristics</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence initial={false}>
              {turns.filter((t) => t.kind !== 'report').map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={t.kind === 'user' ? 'flex justify-end' : 'flex gap-2'}
                >
                  {t.kind === 'bot' && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold mt-1" style={{ background: 'var(--brand-accent)' }}>BI</div>
                  )}
                  <div
                    className="px-3 py-2 rounded-xl text-sm max-w-[260px]"
                    style={t.kind === 'user'
                      ? { background: 'var(--brand-accent)', color: 'white', borderTopRightRadius: 4 }
                      : { background: 'var(--surface-2)', color: 'var(--text-primary)', borderTopLeftRadius: 4 }}
                  >
                    {t.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {runQuery.isPending && (
              <div className="flex gap-2 items-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="animate-spin" /> Generating report…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleFormSubmit} className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your data…"
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              disabled={runQuery.isPending}
            />
            <button
              type="submit"
              disabled={runQuery.isPending || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
              style={{ background: 'var(--brand-accent)' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Reports column */}
        <div className="space-y-4">
          {turns.filter((t) => t.kind === 'report').length === 0 && !runQuery.isPending && (
            <div className="card-soft p-12 text-center" style={{ border: '1px dashed var(--border-color)' }}>
              <BarChart3 size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No reports yet</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Click a quick report or type a question to get started.
              </p>
            </div>
          )}

          <AnimatePresence>
            {turns
              .filter((t) => t.kind === 'report' && t.report)
              .reverse()
              .map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-soft p-5"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <ReportCardBody
                    report={t.report!}
                    onExport={() => exportCSV(t.report!)}
                    onClose={() => setTurns((all) => {
                      const out = [...all]
                      const realIdx = all.lastIndexOf(t)
                      if (realIdx >= 0) out.splice(realIdx, 1)
                      return out
                    })}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function ReportCardBody({ report, onExport, onClose }: { report: ReportResult; onExport: () => void; onClose: () => void }) {
  const positive = (report.summary.delta ?? 0) >= 0
  const goodWhenUp = !['No-show rate', 'Cancellation rate'].includes(report.summary.label)
  const isGood = goodWhenUp ? positive : !positive
  const range = report.spec.from && report.spec.to
    ? `${report.spec.from} → ${report.spec.to}`
    : null

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{report.title}</h3>
          {range && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{range}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Summary stat */}
      <div className="flex items-baseline gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{report.summary.value}</p>
        {report.summary.delta !== undefined && (
          <div className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: isGood ? '#047857' : '#b91c1c' }}>
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(report.summary.delta)}% {report.summary.deltaLabel}
          </div>
        )}
        {report.parsedFrom && (
          <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            via {report.parsedFrom}
          </span>
        )}
      </div>

      <ReportChart report={report} />
    </>
  )
}
