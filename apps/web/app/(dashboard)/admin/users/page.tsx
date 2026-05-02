'use client'
import { Users as UsersIcon } from 'lucide-react'

export default function AdminUsersPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}
        >
          User Management
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage users, roles, and permissions
        </p>
      </div>

      <div
        className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
      >
        <UsersIcon size={48} style={{ color: 'var(--text-muted)' }} />
        <p className="mt-4 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
          User Management
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Coming in Phase 3 — Full user table with role management and status controls
        </p>
      </div>
    </div>
  )
}
