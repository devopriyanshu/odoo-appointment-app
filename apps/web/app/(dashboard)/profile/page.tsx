'use client'
import { useState } from 'react'
import { User, Phone, Mail, Save } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useMe } from '@/hooks/useAuth'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { refetch } = useMe()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.patch(`/users/${user?.id}`, { name, phone: phone || undefined })
      setUser(res.data.user)
      refetch()
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1
        className="text-3xl font-bold mb-1"
        style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}
      >
        Profile
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Manage your account settings
      </p>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'var(--brand-accent)' }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user?.name}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(108,99,255,0.2)', color: 'var(--brand-accent)' }}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              <User size={14} className="inline mr-1" /> Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              <Mail size={14} className="inline mr-1" /> Email
            </label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl text-sm outline-none opacity-60"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={14} className="inline mr-1" /> Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand-accent)' }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
