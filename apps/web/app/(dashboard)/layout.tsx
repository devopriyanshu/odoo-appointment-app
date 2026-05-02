'use client'
import { useUIStore } from '@/store/uiStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { ChatWidget } from '@/components/ai/ChatWidget'
import { motion } from 'framer-motion'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore()
  const marginLeft = sidebarOpen ? 256 : 72

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-primary)' }}>
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Topbar — hidden on mobile */}
      <div className="hidden md:block">
        <Topbar />
      </div>

      {/* Main content */}
      <motion.main
        animate={{ marginLeft }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="pt-[60px] pb-20 md:pb-6 px-4 md:px-6 min-h-screen"
        style={{ marginLeft: 0 }}
      >
        <div
          className="hidden md:block"
          style={{ height: 0 }}
          // Spacer — margin-left handled by motion
        />
        <motion.div
          className="md:ml-0"
          style={{ marginLeft: `${marginLeft}px` }}
          animate={{ marginLeft }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="py-6"
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.main>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  )
}
