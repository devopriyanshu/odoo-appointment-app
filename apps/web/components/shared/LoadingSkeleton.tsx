import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function ServiceCardSkeleton() {
  return (
    <div className="card-soft overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
      <Skeleton className="h-32 rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export function SlotGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-xl" />
      ))}
    </div>
  )
}

export function AppointmentCardSkeleton() {
  return (
    <div className="rounded-xl p-4 flex gap-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
      <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}
