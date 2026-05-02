'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Search, Users as UsersIcon, Shield, ShieldCheck, UserCheck, UserX, ChevronDown } from 'lucide-react'
import { useUsers, useToggleUserActive, useChangeUserRole } from '@/hooks/useUsers'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: 'rgba(255,77,109,0.12)', color: '#ff4d6d' },
  ORGANISER: { bg: 'rgba(108,99,255,0.12)', color: '#6c63ff' },
  CUSTOMER: { bg: 'rgba(0,212,170,0.12)', color: '#00d4aa' },
}

const ROLE_FILTER: string[] = ['ALL', 'CUSTOMER', 'ORGANISER', 'ADMIN']

export default function AdminUsersPage() {
  const { data, isLoading } = useUsers()
  const toggleActive = useToggleUserActive()
  const changeRole = useChangeUserRole()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const users = (data?.users || []).filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const deactivateUser = users.find(u => u.id === deactivateId)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2"
          style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          <UsersIcon size={28} style={{ color: 'var(--brand-accent)' }} />
          User Management
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage users, roles, and account status ({users.length} total)
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {ROLE_FILTER.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={roleFilter === r
                ? { background: 'var(--brand-accent)', color: 'white' }
                : { color: 'var(--text-muted)' }
              }>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--surface-2)' }}>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: 'var(--surface-1)' }}>
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : (
              users.map((user) => {
                const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.CUSTOMER
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    className="transition-all hover:bg-[var(--surface-3)]">
                    {/* Name + Avatar */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: roleStyle.color }}>
                          {user.name[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                          {user.phone && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    {/* Role */}
                    <td className="px-5 py-3 relative">
                      <button
                        onClick={() => setRoleDropdown(roleDropdown === user.id ? null : user.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-all hover:opacity-80"
                        style={{ background: roleStyle.bg, color: roleStyle.color }}
                      >
                        {user.role === 'ADMIN' ? <Shield size={11} /> : user.role === 'ORGANISER' ? <ShieldCheck size={11} /> : null}
                        {user.role}
                        <ChevronDown size={10} />
                      </button>
                      {/* Role Dropdown */}
                      {roleDropdown === user.id && (
                        <div className="absolute top-full left-5 mt-1 z-50 rounded-xl shadow-xl py-1 min-w-[140px]"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
                          {['CUSTOMER', 'ORGANISER', 'ADMIN'].map((r) => (
                            <button key={r} onClick={() => {
                              if (r !== user.role) changeRole.mutate({ id: user.id, role: r })
                              setRoleDropdown(null)
                            }}
                              className="w-full text-left px-4 py-2 text-sm transition-all hover:bg-[var(--surface-3)]"
                              style={{ color: user.role === r ? 'var(--brand-accent)' : 'var(--text-secondary)', fontWeight: user.role === r ? 600 : 400 }}>
                              {r === 'ADMIN' && <Shield size={12} className="inline mr-1.5" />}
                              {r === 'ORGANISER' && <ShieldCheck size={12} className="inline mr-1.5" />}
                              {r}
                              {user.role === r && ' ✓'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() => {
                          if (user.isActive) {
                            setDeactivateId(user.id)
                          } else {
                            toggleActive.mutate({ id: user.id, isActive: true })
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all hover:opacity-80"
                        style={user.isActive
                          ? { background: 'rgba(0,212,170,0.12)', color: '#00d4aa' }
                          : { background: 'rgba(255,77,109,0.12)', color: '#ff4d6d' }
                        }
                      >
                        {user.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {/* Joined */}
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() => user.isActive ? setDeactivateId(user.id) : toggleActive.mutate({ id: user.id, isActive: true })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={user.isActive
                          ? { background: 'rgba(255,77,109,0.1)', color: '#ff4d6d' }
                          : { background: 'rgba(0,212,170,0.1)', color: '#00d4aa' }
                        }
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => {
          if (deactivateId) {
            toggleActive.mutate({ id: deactivateId, isActive: false }, {
              onSuccess: () => setDeactivateId(null),
            })
          }
        }}
        title="Deactivate user?"
        description={`Are you sure you want to deactivate "${deactivateUser?.name}"? They won't be able to log in until reactivated.`}
        confirmLabel="Deactivate"
        dangerous
        loading={toggleActive.isPending}
      />
    </div>
  )
}
