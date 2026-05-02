'use client'
import { useQuery } from '@tanstack/react-query'
import { Shield, Users, Briefcase, CalendarDays, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { StatCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { AnalyticsSummary } from '@/types'

export default function AdminPage() {
  const { data: summary, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => { const r = await api.get('/analytics/summary'); return r.data.data },
  })

  const { data: usersData, isLoading: usersLoading } = useQuery<{ total: number }>({
    queryKey: ['users', 'count'],
    queryFn: async () => { const r = await api.get('/users'); return r.data },
  })

  const { data: servicesData, isLoading: servicesLoading } = useQuery<{ services: unknown[] }>({
    queryKey: ['services', 'all'],
    queryFn: async () => { const r = await api.get('/services/mine'); return r.data },
  })

  const stats = [
    {
      label: 'Total Users',
      value: usersLoading ? '—' : usersData?.total ?? '—',
      icon: <Users size={20} />,
      color: '#6c63ff',
      bg: 'rgba(108,99,255,0.12)',
    },
    {
      label: 'Total Services',
      value: servicesLoading ? '—' : (servicesData?.services?.length ?? '—'),
      icon: <Briefcase size={20} />,
      color: '#00d4aa',
      bg: 'rgba(0,212,170,0.12)',
    },
    {
      label: 'Total Bookings',
      value: isLoading ? '—' : summary?.totalBookings ?? '—',
      icon: <CalendarDays size={20} />,
      color: '#4da6ff',
      bg: 'rgba(77,166,255,0.12)',
    },
    {
      label: 'Revenue (month)',
      value: isLoading ? '—' : `₹${Number(summary?.revenueTotal ?? 0).toLocaleString('en-IN')}`,
      icon: <TrendingUp size={20} />,
      color: '#f0a500',
      bg: 'rgba(240,165,0,0.12)',
    },
  ]

  const quickLinks = [
    { label: 'User Management', href: '/admin/users', icon: <Users size={20} />, description: 'Manage roles, activate/deactivate accounts', color: '#6c63ff' },
    { label: 'Analytics', href: '/admin/analytics', icon: <TrendingUp size={20} />, description: 'Booking trends, peak hours, revenue charts', color: '#00d4aa' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2"
          style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          <Shield size={28} style={{ color: 'var(--brand-accent)' }} />
          Admin Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>System-wide overview and controls</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading || usersLoading || servicesLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                {s.value}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {/* Booking status breakdown */}
      {summary && (
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            Booking Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Confirmed', value: summary.confirmedCount, color: '#00d4aa' },
              { label: 'Pending', value: summary.pendingCount, color: '#f0a500' },
              { label: 'Completed', value: summary.completedCount, color: '#9999cc' },
              { label: 'Cancelled', value: summary.cancelledCount, color: '#ff4d6d' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--surface-3)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-xl font-bold" style={{ color: item.color, fontFamily: 'Plus Jakarta Sans' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
        Quick Access
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: link.color }}>
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>{link.label}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{link.description}</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}
