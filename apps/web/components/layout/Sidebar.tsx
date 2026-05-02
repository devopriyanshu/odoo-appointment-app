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
  { label: 'Home', href: '/', icon: <LayoutGrid size={20} />, roles: ['CUSTOMER', 'ORGANISER', 'ADMIN'] },
  { label: 'My Appointments', href: '/appointments', icon: <CalendarCheck size={20} />, roles: ['CUSTOMER'] },
  { label: 'Dashboard', href: '/organiser', icon: <BarChart2 size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'My Services', href: '/organiser/services', icon: <Briefcase size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'All Bookings', href: '/organiser/bookings', icon: <BookOpen size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'Calendar', href: '/organiser/calendar', icon: <Calendar size={20} />, roles: ['ORGANISER', 'ADMIN'] },
  { label: 'Admin Panel', href: '/admin', icon: <Shield size={20} />, roles: ['ADMIN'] },
  { label: 'Users', href: '/admin/users', icon: <Users size={20} />, roles: ['ADMIN'] },
  { label: 'Analytics', href: '/admin/analytics', icon: <TrendingUp size={20} />, roles: ['ADMIN'] },
  { label: 'My Appointments', href: '/appointments', icon: <CalendarCheck size={20} />, roles: ['ORGANISER', 'ADMIN'] },
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
      animate={{ width: sidebarOpen ? 256 : 72 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden"
      style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border-color)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--brand-accent)' }}>
          <Calendar size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 font-bold text-base whitespace-nowrap overflow-hidden"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)' }}
            >
              AppointmentPro
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
                  'flex items-center h-11 px-4 mx-2 mb-0.5 rounded-lg transition-all duration-150 cursor-pointer relative',
                  active ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
                )}
                style={active ? { background: 'var(--brand-accent)', borderLeft: 'none' } : {}}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-3 text-sm font-medium whitespace-nowrap"
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
      <div className="border-t py-3" style={{ borderColor: 'var(--border-color)' }}>
        {/* User info */}
        <div className="flex items-center px-4 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--brand-accent)' }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-2 overflow-hidden"
              >
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: 140 }}>
                  {user?.name}
                </p>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                  background: 'rgba(108,99,255,0.2)', color: 'var(--brand-accent)', fontSize: 10
                }}>
                  {role}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout.mutate()}
          className="flex items-center h-10 px-4 mx-2 rounded-lg transition-all duration-150 w-[calc(100%-16px)] hover:bg-red-500/10 hover:text-red-400"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={18} className="flex-shrink-0" />
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

        {/* Toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg mx-auto mt-2 transition-all hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-muted)' }}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}
