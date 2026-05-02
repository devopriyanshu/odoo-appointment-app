'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, CalendarCheck, User, BarChart2, Briefcase,
  BookOpen, Calendar, Shield, Users, TrendingUp, ChevronLeft,
  ChevronRight, LogOut, MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useLogout } from '@/hooks/useAuth'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: <LayoutGrid size={20} />, roles: ['CUSTOMER', 'ORGANISER'] },
  { label: 'My Appointments', href: '/appointments', icon: <CalendarCheck size={20} />, roles: ['CUSTOMER'] },
  { label: 'Dashboard', href: '/organiser', icon: <BarChart2 size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'My Services', href: '/organiser/services', icon: <Briefcase size={20} />, roles: ['ORGANISER'] },
  { label: 'All Bookings', href: '/organiser/bookings', icon: <BookOpen size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'Calendar', href: '/organiser/calendar', icon: <Calendar size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'Users', href: '/admin/users', icon: <Users size={20} />, roles: ['ADMIN'] },
  { label: 'Analytics', href: '/organiser/analytics', icon: <TrendingUp size={20} />, roles: ['ORGANISER'] },
  { label: 'My Appointments', href: '/appointments', icon: <CalendarCheck size={20} />, roles: ['ORGANISER'] },
  { label: 'Profile', href: '/profile', icon: <User size={20} />, roles: ['CUSTOMER', 'ORGANISER', 'ADMIN'] },
]

const uniqueNav = navItems.filter(
  (item, idx, arr) => arr.findIndex((i) => i.href === item.href && JSON.stringify(i.roles) === JSON.stringify(item.roles)) === idx
)

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const logout = useLogout()

  const role = user?.role || 'CUSTOMER'
  const visibleItems = uniqueNav.filter((item) => item.roles.includes(role))

  const activeItem = visibleItems
    .filter(item => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]

  const isActive = (href: string) => {
    return activeItem?.href === href
  }

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden"
      style={{ background: 'var(--brand-dark)', color: 'rgba(255,255,255,0.9)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--brand-dark)' }}>
          <Calendar size={18} strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 font-bold text-base whitespace-nowrap overflow-hidden text-white"
            >
              Slotly
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href + item.label} href={item.href}>
              <div
                className={cn(
                  'flex items-center h-10 px-3 mx-2 mb-1 rounded-xl transition-all duration-150 cursor-pointer relative',
                )}
                style={active
                  ? { background: 'rgba(255,255,255,0.12)', color: 'white' }
                  : { color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" style={{ background: 'var(--brand-accent-2)' }} />
                )}
                <span className="flex-shrink-0 flex items-center justify-center w-8">{item.icon}</span>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-2 text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: User + Collapse */}
      <div className="py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center px-4 mb-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--brand-accent-2)', color: 'var(--brand-dark)' }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-3 overflow-hidden"
              >
                <p className="text-sm font-medium truncate text-white" style={{ maxWidth: 140 }}>
                  {user?.name}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                  background: 'rgba(20,184,166,0.2)', color: 'var(--brand-accent-2)',
                }}>
                  {role}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => logout.mutate()}
          className="flex items-center h-10 px-3 mx-2 rounded-xl w-[calc(100%-16px)] transition-all"
          style={{ color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,77,109,0.12)'; e.currentTarget.style.color = '#fca5a5' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
        >
          <LogOut size={18} className="flex-shrink-0 ml-1" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-3 text-sm whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg mx-auto mt-2 transition-all"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}
