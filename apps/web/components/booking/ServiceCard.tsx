'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Clock, MapPin, Users, ArrowRight, IndianRupee,
  Sparkles, Stethoscope, Dumbbell, Briefcase, GraduationCap, Calendar, Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppointmentType } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  Stethoscope, Sparkles, Dumbbell, Briefcase, GraduationCap, Calendar, Tag,
}

interface ServiceCardProps {
  service: AppointmentType
  shareMode?: boolean
}

export function ServiceCard({ service, shareMode }: ServiceCardProps) {
  const router = useRouter()
  const accent = service.category?.color || '#0f766e'
  const Icon = (service.category?.icon && ICONS[service.category.icon]) || Tag

  const handleBook = () => {
    router.push(`/book/${service.id}`)
  }

  const initial = service.name.trim().charAt(0).toUpperCase()

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      onClick={handleBook}
      className="card-soft card-hover cursor-pointer group flex flex-col overflow-hidden"
      style={{ border: '1px solid var(--border-color)' }}
    >
      {/* Cover */}
      <div className="relative h-32 flex items-center justify-center overflow-hidden"
        style={{
          background: service.coverImageUrl
            ? undefined
            : `linear-gradient(135deg, ${accent}1a 0%, ${accent}33 100%)`,
        }}>
        {service.coverImageUrl ? (
          <img src={service.coverImageUrl} alt={service.name} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-30" style={{
              background: `radial-gradient(circle at 30% 30%, ${accent}, transparent 60%)`,
            }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ background: 'white', color: accent, boxShadow: `0 8px 24px ${accent}33` }}>
              {initial}
            </div>
          </>
        )}

        {/* Category chip */}
        {service.category && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.85)', color: accent }}>
            <Icon size={11} /> {service.category.name}
          </div>
        )}

        {!service.isPublished && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(245, 158, 11, 0.95)', color: 'white' }}>
            Preview
          </div>
        )}

        {/* Hover overlay arrow */}
        <div className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'white', color: accent, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          <ArrowRight size={14} />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-base mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
          {service.name}
        </h3>
        {service.description && (
          <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {service.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs mb-4 mt-auto" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'var(--surface-2)' }}>
            <Clock size={11} /> {service.durationMinutes} min
          </span>
          {service.resources && service.resources.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'var(--surface-2)' }}>
              <Users size={11} /> {service.resources.length}
            </span>
          )}
          {service.requiresAdvancePayment && service.advancePaymentAmount && (
            <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
              <IndianRupee size={11} />{Number(service.advancePaymentAmount).toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {service.location && (
          <div className="flex items-center gap-1 text-xs mb-4 -mt-2" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={11} className="flex-shrink-0" />
            <span className="truncate">{service.location}</span>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); handleBook() }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-1.5"
          style={{ background: accent }}
        >
          Book Now <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  )
}
