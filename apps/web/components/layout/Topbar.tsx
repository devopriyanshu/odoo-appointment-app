'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useUIStore } from '@/store/uiStore'

const routeTitles: Record<string, string> = {
  '/': 'Book an Appointment',
  '/appointments': 'My Appointments',
  '/profile': 'Profile',
  '/organiser': 'Organiser Dashboard',
  '/organiser/services': 'My Services',
  '/organiser/bookings': 'All Bookings',
  '/organiser/calendar': 'Calendar',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/analytics': 'Analytics',
}

function getTitle(pathname: string) {
  if (routeTitles[pathname]) return routeTitles[pathname]
  if (pathname.startsWith('/book')) return 'Book Appointment'
  if (pathname.startsWith('/appointments')) return 'Appointment Detail'
  if (pathname.startsWith('/organiser/services')) return 'Services'
  return 'AppointmentPro'
}

export function Topbar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { sidebarOpen } = useUIStore()
  const logout = useLogout()
  const [dropOpen, setDropOpen] = useState(false)
  const router = useRouter()

  const marginLeft = sidebarOpen ? 240 : 72

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-6"
      style={{
        left: marginLeft,
        height: 64,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        transition: 'left 0.2s ease',
      }}
    >
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {getTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--c-danger)' }} />
        </button>

        <div className="relative">
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl transition-all"
            style={{ background: 'var(--surface-2)' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--brand-accent)' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-semibold hidden md:block" style={{ color: 'var(--text-primary)' }}>
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {dropOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-xl shadow-lg w-48 py-1 z-50"
              style={{ background: 'white', border: '1px solid var(--border-color)', boxShadow: '0 12px 32px rgba(15,31,29,0.12)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
              <button
                onClick={() => { router.push('/profile'); setDropOpen(false) }}
                className="flex items-center w-full px-4 py-2 text-sm transition-all hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-primary)' }}
              >
                Profile settings
              </button>
              <button
                onClick={() => logout.mutate()}
                className="flex items-center w-full px-4 py-2 text-sm transition-all"
                style={{ color: 'var(--c-danger)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
