import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4" style={{ color: 'var(--text-muted)' }}>{icon}</div>
      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--brand-accent)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
