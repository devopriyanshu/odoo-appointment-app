import type { BookingStatus } from '@/types'

const labels: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const cls = `status-badge--${status.toLowerCase().replace('_', '_')}`
  return <span className={cls}>{labels[status]}</span>
}
