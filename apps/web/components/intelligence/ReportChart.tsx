'use client'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { ReportResult } from '@/hooks/useIntelligence'

const PALETTE = ['#0f766e', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']

interface Props {
  report: ReportResult
}

export function ReportChart({ report }: Props) {
  const { chartHint, data, spec } = report
  if (!data.length) {
    return <div className="text-sm py-12 text-center" style={{ color: 'var(--text-muted)' }}>No data for this query.</div>
  }

  const isPercent = ['noShowRate', 'cancelRate', 'completionRate', 'utilization'].includes(spec.metric)
  const isCurrency = spec.metric === 'revenue'

  const fmt = (v: number) => {
    if (isPercent) return `${v}%`
    if (isCurrency) return `₹${Math.round(v).toLocaleString('en-IN')}`
    return v.toLocaleString('en-IN')
  }

  if (chartHint === 'line') {
    return (
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={fmt} width={60} />
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
              formatter={(v: unknown) => fmt(Number(v ?? 0))}
            />
            <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartHint === 'bar') {
    return (
      <div style={{ width: '100%', height: Math.max(220, data.length * 32 + 40) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
              formatter={(v: unknown) => fmt(Number(v ?? 0))}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartHint === 'pie') {
    return (
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
              formatter={(v: unknown) => fmt(Number(v ?? 0))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // table fallback
  return (
    <div className="overflow-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--surface-2)' }}>
          <tr>
            <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Label</th>
            <th className="px-4 py-2 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.key} style={{ borderTop: '1px solid var(--border-color)' }}>
              <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>{r.label}</td>
              <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
