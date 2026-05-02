export interface User {
  id: string
  name: string
  email: string
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN'
  phone?: string
  isActive?: boolean
  createdAt?: string
}

export interface Resource {
  id: string
  name: string
  resourceType: 'USER' | 'RESOURCE'
  isActive: boolean
  user?: { id: string; name: string; email: string } | null
}

export interface WorkingHours {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface BookingQuestion {
  id: string
  question: string
  isRequired: boolean
  sequence: number
}

export interface AppointmentType {
  id: string
  name: string
  description?: string | null
  durationMinutes: number
  resourceType: 'USER' | 'RESOURCE'
  slotScheduleType: 'WEEKLY' | 'FLEXIBLE'
  maxCapacityPerSlot: number
  manageCapacity: boolean
  requiresManualConfirm: boolean
  requiresAdvancePayment: boolean
  advancePaymentAmount?: number | null
  isPublished: boolean
  shareToken?: string | null
  location?: string | null
  coverImageUrl?: string | null
  organiserId: string
  resources: Resource[]
  workingHours: WorkingHours[]
  bookingQuestions: BookingQuestion[]
  _count?: { bookings: number }
}

export interface SlotResult {
  startTime: string
  endTime: string
  availableCapacity: number
  isFull: boolean
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED' | 'COMPLETED' | 'NO_SHOW'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'WAIVED' | 'REFUNDED'

export interface BookingAnswer {
  id: string
  answer: string
  question: BookingQuestion
}

export interface AuditLog {
  id: string
  actorId: string
  action: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface Booking {
  id: string
  customerId: string
  appointmentTypeId: string
  resourceId?: string | null
  scheduledStart: string
  scheduledEnd: string
  capacity: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  paymentAmount?: number | null
  paymentReference?: string | null
  cancelReason?: string | null
  confirmationCode: string
  createdAt: string
  customer: { id: string; name: string; email: string; phone?: string | null }
  appointmentType: AppointmentType
  resource?: Resource | null
  answers?: BookingAnswer[]
  auditLog?: AuditLog[]
}

export interface AnalyticsSummary {
  totalBookings: number
  confirmedCount: number
  pendingCount: number
  cancelledCount: number
  completedCount: number
  noShowCount: number
  revenueTotal: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface BookingAction {
  action: 'BOOK'
  appointmentTypeId: string
  scheduledStart: string
  resourceId?: string
  capacity?: number
}
