'use client'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart2, Clock, Briefcase, Users } from 'lucide-react'
import {
  useAnalyticsSummary,
  useAnalyticsTrend,
  useAnalyticsPeakHours,
  useAnalyticsByService,
  useAnalyticsProviderUtilization,
} from '@/hooks/useAnalytics'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { StatCardSkeleton } from '@/components/shared/LoadingSkeleton'

const ACCENT_COLORS = ['#6c63ff', '#00d4aa', '#4da6ff', '#f0a500', '#ff4d6d', '#9966ff', '#00bcd4']

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--brand-accent)' }}>{icon}</span>
        <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 shadow-xl text-xs"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
      <p className="font-medium">{label}</p>
      <p style={{ color: 'var(--brand-accent)' }}>{payload[0].value} bookings</p>
    </div>
  )
}

export default function OrganiserAnalyticsPage() {
  const { data: summary, isLoading: sumLoading } = useAnalyticsSummary()
  const { data: trend, isLoading: trendLoading } = useAnalyticsTrend(30)
  const { data: peakHours, isLoading: peakLoading } = useAnalyticsPeakHours()
  const { data: byService, isLoading: serviceLoading } = useAnalyticsByService()
  const { data: utilization, isLoading: utilLoading } = useAnalyticsProviderUtilization()

  const stats = [
    { label: 'Total Bookings', value: summary?.totalBookings ?? '—', icon: <BarChart2 size={20} />, color: '#4da6ff', bg: 'rgba(77,166,255,0.12)' },
    { label: 'Confirmed', value: summary?.confirmedCount ?? '—', icon: <TrendingUp size={20} />, color: '#00d4aa', bg: 'rgba(0,212,170,0.12)' },
    { label: 'Pending', value: summary?.pendingCount ?? '—', icon: <Clock size={20} />, color: '#f0a500', bg: 'rgba(240,165,0,0.12)' },
    { label: 'Revenue (month)', value: `₹${Number(summary?.revenueTotal ?? 0).toLocaleString('en-IN')}`, icon: <TrendingUp size={20} />, color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
  ]

  const peakData = (peakHours || []).map((p) => ({
    ...p,
    label: `${p.hour % 12 || 12}${p.hour < 12 ? 'am' : 'pm'}`,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2"
          style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          <TrendingUp size={28} style={{ color: 'var(--brand-accent)' }} />
          Analytics
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Booking trends, peak hours, and provider utilization
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>{s.value}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Trend chart */}
      <ChartCard title="Booking Trend (30 Days)" icon={<TrendingUp size={16} />}>
        {trendLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend || []}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(v: string) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}` }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#6c63ff" strokeWidth={2.5} fill="url(#trendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <ChartCard title="Peak Booking Hours" icon={<Clock size={16} />}>
          {peakLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={peakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {peakData.map((_: unknown, i: number) => (
                    <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* By Service */}
        <ChartCard title="Bookings by Service" icon={<Briefcase size={16} />}>
          {serviceLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : !byService?.length ? (
            <div className="h-52 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byService}
                  dataKey="count"
                  nameKey="serviceName"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  strokeWidth={2}
                  stroke="var(--surface-2)"
                >
                  {byService.map((_: unknown, i: number) => (
                    <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} bookings`, '']}
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Provider Utilization */}
      {/* <ChartCard title="Provider Utilization (30 Days)" icon={<Users size={16} />}>
        {utilLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : !utilization?.length ? (
          <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No providers found</div>
        ) : (
          <div className="space-y-3">
            {utilization.map((p, i) => (
              <div key={p.resourceName} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                  {p.resourceName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.resourceName}</p>
                    <span className="text-xs font-semibold ml-2" style={{ color: ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                      {p.utilization}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.utilization}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}
                    />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.bookingCount} bookings</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard> */}
    </div>
  )
}
