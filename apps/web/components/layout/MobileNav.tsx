'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, CalendarCheck, User, BarChart2, Briefcase, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { toggleChat } = useUIStore()
  const role = user?.role || 'CUSTOMER'

  type NavItem = {
    label: string
    href: string
    icon: React.ReactNode
    action?: () => void
  }

  const customerItems: NavItem[] = [
    { label: 'Home', href: '/', icon: <LayoutGrid size={22} /> },
    { label: 'Bookings', href: '/appointments', icon: <CalendarCheck size={22} /> },
    { label: 'Profile', href: '/profile', icon: <User size={22} /> },
    { label: 'AI Chat', href: '#', icon: <MessageCircle size={22} />, action: toggleChat },
  ]

  const organiserItems: NavItem[] = [
    { label: 'Dashboard', href: '/organiser', icon: <BarChart2 size={22} /> },
    { label: 'Services', href: '/organiser/services', icon: <Briefcase size={22} /> },
    { label: 'Bookings', href: '/organiser/bookings', icon: <CalendarCheck size={22} /> },
    { label: 'Profile', href: '/profile', icon: <User size={22} /> },
  ]

  const items = role === 'CUSTOMER' ? customerItems : organiserItems

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href) && item.href !== '#'
        return (
          item.action ? (
            <button
              key={item.label}
              onClick={item.action}
              className="flex-1 flex flex-col items-center py-3 gap-1 transition-all"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ) : (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center py-3 gap-1 transition-all">
              <span style={{ color: active ? 'var(--brand-accent)' : 'var(--text-muted)' }}>{item.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: active ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
                {item.label}
              </span>
            </Link>
          )
        )
      })}
    </nav>
  )
}
