'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Moon, Sun, ChevronDown } from 'lucide-react'
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
  const [dark, setDark] = useState(true)
  const [dropOpen, setDropOpen] = useState(false)
  const router = useRouter()

  const marginLeft = sidebarOpen ? 256 : 72

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-6 border-b"
      style={{
        left: marginLeft,
        height: 60,
        background: 'var(--surface-1)',
        borderColor: 'var(--border-color)',
        transition: 'left 0.2s ease',
      }}
    >
      <h1
        className="text-lg font-semibold"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)' }}
      >
        {getTitle(pathname)}
      </h1>

      <div className="flex items-center gap-3">
        {/* Dark/light toggle (visual only) */}
        <button
          onClick={() => setDark(!dark)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-muted)' }}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <Bell size={16} />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:bg-[var(--surface-3)]"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--brand-accent)' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium hidden md:block" style={{ color: 'var(--text-primary)' }}>
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {dropOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl shadow-xl border w-44 py-1 z-50"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => { router.push('/profile'); setDropOpen(false) }}
                className="flex items-center w-full px-4 py-2 text-sm transition-all hover:bg-[var(--surface-3)]"
                style={{ color: 'var(--text-primary)' }}
              >
                Profile
              </button>
              <hr style={{ borderColor: 'var(--border-color)' }} className="my-1" />
              <button
                onClick={() => logout.mutate()}
                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
