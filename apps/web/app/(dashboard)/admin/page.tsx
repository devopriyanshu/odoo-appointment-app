'use client'
import { Shield, Users, BarChart2, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const quickLinks = [
  { label: 'User Management', href: '/admin/users', icon: <Users size={24} />, description: 'Manage all users and roles', color: '#6c63ff' },
  { label: 'Analytics', href: '/admin/analytics', icon: <TrendingUp size={24} />, description: 'View booking trends and insights', color: '#00d4aa' },
]

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}
        >
          <Shield size={28} className="inline mr-2 mb-1" style={{ color: 'var(--brand-accent)' }} />
          Admin Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          System overview and management
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-2xl p-6 cursor-pointer group"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ background: link.color }}
              >
                {link.icon}
              </div>
              <h3
                className="font-semibold text-lg mb-1"
                style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}
              >
                {link.label}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {link.description}
              </p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}
