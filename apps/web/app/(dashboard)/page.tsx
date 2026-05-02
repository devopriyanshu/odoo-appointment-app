'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search, Sparkles, Stethoscope, Dumbbell, Briefcase,
  GraduationCap, Calendar, Tag, ArrowRight, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useServices, useCategories } from '@/hooks/useServices'
import { useAuthStore } from '@/store/authStore'
import { ServiceCard } from '@/components/booking/ServiceCard'
import { ServiceCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { AppointmentType, ServiceCategory } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  Stethoscope, Sparkles, Dumbbell, Briefcase, GraduationCap, Calendar, Tag,
}

function CategoryIcon({ name, size = 20, className }: { name?: string | null; size?: number; className?: string }) {
  const Comp = (name && ICONS[name]) || Tag
  return <Comp size={size} className={className} />
}

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: categories } = useCategories()
  const { data: services, isLoading } = useServices({
    category: selectedCategory ?? undefined,
    q: debouncedSearch || undefined,
  })

  useEffect(() => {
    if (user?.role === 'ADMIN') router.replace('/organiser')
  }, [user?.role, router])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const featured = useMemo(() => (services ?? []).slice(0, 6), [services])
  const activeCategoryName = selectedCategory
    ? categories?.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory
    : null

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* === Hero === */}
      <section className="hero-gradient rounded-3xl px-6 py-10 md:px-12 md:py-14 relative overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ background: 'rgba(15,118,110,0.1)', color: 'var(--brand-accent)' }}>
              <Sparkles size={12} /> Smart booking, simplified
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3 leading-tight" style={{ color: 'var(--text-primary)' }}>
              Hi {user?.name?.split(' ')[0] || 'there'} —
              <br />
              find the perfect time
            </h1>
            <p className="text-base md:text-lg mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Browse services, pick a slot, and confirm in seconds.
              All your appointments in one place.
            </p>

            {/* Hero search */}
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dental, yoga, tutoring…"
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={{ background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxShadow: '0 4px 16px rgba(15,31,29,0.06)' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)]"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Decorative illustration — pure CSS/SVG, no external assets */}
          <div className="hidden md:flex justify-center items-center relative">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* === Categories === */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Browse by category
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Pick a category to narrow down services
            </p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: 'var(--brand-accent)' }}
            >
              Clear filter <X size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(categories ?? []).map((cat: ServiceCategory) => {
            const active = selectedCategory === cat.slug
            return (
              <motion.button
                key={cat.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(active ? null : cat.slug)}
                className="card-soft card-hover p-4 text-left transition-all"
                style={active ? { borderColor: cat.color || 'var(--brand-accent)', boxShadow: `0 0 0 2px ${cat.color || 'var(--brand-accent)'}33` } : { border: '1px solid var(--border-color)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: (cat.color || '#0f766e') + '1a', color: cat.color || 'var(--brand-accent)' }}
                >
                  <CategoryIcon name={cat.icon} size={18} />
                </div>
                <p className="text-sm font-semibold leading-tight mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {cat.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {cat._count?.services ?? 0} {cat._count?.services === 1 ? 'service' : 'services'}
                </p>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* === Services grid === */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {activeCategoryName ? `${activeCategoryName} services` : debouncedSearch ? `Results for "${debouncedSearch}"` : 'All services'}
          </h2>
          {!isLoading && services && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {services.length} found
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
          </div>
        ) : !services?.length ? (
          <EmptyState
            icon={<Search size={56} />}
            title="No services found"
            description={debouncedSearch ? `Nothing matches "${debouncedSearch}"` : 'Try a different category or clear filters.'}
            actionLabel={debouncedSearch || selectedCategory ? 'Clear filters' : undefined}
            onAction={debouncedSearch || selectedCategory ? () => { setSearch(''); setSelectedCategory(null) } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((service: AppointmentType) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            {services.length > 6 && featured.length < services.length && services.slice(6).map((service: AppointmentType) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      {/* === CTA === */}
      <section className="rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)' }}>
        <div className="text-white">
          <h3 className="text-lg md:text-xl font-bold mb-1">Need it faster?</h3>
          <p className="text-sm opacity-90">Use voice or chat with our AI assistant — book in 30 seconds.</p>
        </div>
        <button
          onClick={() => {
            const event = new CustomEvent('open-chat')
            window.dispatchEvent(event)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white"
          style={{ color: '#0f766e' }}
        >
          Try AI Assistant <ArrowRight size={16} />
        </button>
      </section>
    </div>
  )
}

function HeroIllustration() {
  return (
    <div className="relative w-72 h-72 lg:w-80 lg:h-80">
      {/* Big circle */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, #ccfbf1 0%, #a7f3d0 100%)' }} />
      {/* Calendar card */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [-4, 4, -4] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="absolute top-8 left-4 w-44 rounded-2xl p-4 bg-white"
        style={{ boxShadow: '0 12px 32px rgba(15,31,29,0.12)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ccfbf1', color: '#0f766e' }}>
            <Calendar size={14} />
          </div>
          <span className="text-xs font-semibold" style={{ color: '#0f1f1d' }}>Today</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: '#0f1f1d' }}>Dental Checkup</p>
        <p className="text-[10px]" style={{ color: '#8a9794' }}>10:30 AM · Dr. Sharma</p>
        <div className="mt-3 inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}>
          Confirmed
        </div>
      </motion.div>
      {/* Slot pill stack */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [3, -5, 3] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
        className="absolute bottom-6 right-2 w-40 rounded-2xl p-3 bg-white"
        style={{ boxShadow: '0 12px 32px rgba(15,31,29,0.12)' }}
      >
        <p className="text-[10px] font-semibold mb-2" style={{ color: '#8a9794' }}>AVAILABLE SLOTS</p>
        <div className="flex flex-wrap gap-1.5">
          {['9:00', '10:00', '11:00', '2:00'].map((s, i) => (
            <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md"
              style={i === 1
                ? { background: '#0f766e', color: 'white' }
                : { background: '#f1f5f4', color: '#4b5b58' }}>
              {s}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
