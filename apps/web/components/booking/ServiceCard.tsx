'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, MapPin, Users } from 'lucide-react'
import type { AppointmentType } from '@/types'

interface ServiceCardProps {
  service: AppointmentType
  shareMode?: boolean
}

const gradients = [
  'from-purple-600/30 to-blue-600/30',
  'from-teal-600/30 to-emerald-600/30',
  'from-orange-600/30 to-pink-600/30',
  'from-blue-600/30 to-indigo-600/30',
]

function getGradient(id: string) {
  const idx = id.charCodeAt(0) % gradients.length
  return gradients[idx]
}

export function ServiceCard({ service, shareMode }: ServiceCardProps) {
  const router = useRouter()

  const handleBook = () => {
    router.push(`/book/${service.id}`)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="rounded-2xl overflow-hidden cursor-pointer group"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}
    >
      {/* Cover */}
      <div className={`h-32 bg-gradient-to-br ${getGradient(service.id)} relative flex items-center justify-center`}>
        {service.coverImageUrl ? (
          <img src={service.coverImageUrl} alt={service.name} className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <div className="text-4xl font-bold opacity-30" style={{ color: 'white', fontFamily: 'Plus Jakarta Sans' }}>
            {service.name[0]}
          </div>
        )}
        {!service.isPublished && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(240,165,0,0.9)', color: 'white' }}>
            Preview
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-bold text-base mb-1 truncate" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          {service.name}
        </h3>
        {service.description && (
          <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {service.description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={13} />
            {service.durationMinutes} min
          </div>
          {service.location && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={13} />
              <span className="truncate max-w-[140px]">{service.location}</span>
            </div>
          )}
          {service.resources && service.resources.length > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Users size={13} />
              {service.resources.length} provider{service.resources.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <button
          onClick={handleBook}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--brand-accent)' }}
        >
          Book Now
        </button>
      </div>
    </motion.div>
  )
}
