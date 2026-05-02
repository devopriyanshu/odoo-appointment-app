import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'

interface SlotResult {
  startTime: Date
  endTime: Date
  availableCapacity: number
  isFull: boolean
}

export async function generateAvailableSlots(
  serviceId: string,
  date: string,
  resourceId?: string
): Promise<{ slots: SlotResult[]; message?: string }> {
  const service = await prisma.appointmentType.findUnique({
    where: { id: serviceId },
    include: { workingHours: true, flexibleSlots: true },
  })

  if (!service) throw new ApiError(404, 'Service not found')

  const targetDate = new Date(date + 'T00:00:00')
  const dayOfWeek = targetDate.getDay()
  const slots: Array<{ startTime: Date; endTime: Date }> = []

  if (service.slotScheduleType === 'WEEKLY') {
    const wh = service.workingHours.find(
      (h) => h.dayOfWeek === dayOfWeek && h.isActive
    )
    if (!wh) {
      return { slots: [], message: 'No availability on this day' }
    }

    const [startH, startM] = wh.startTime.split(':').map(Number)
    const [endH, endM] = wh.endTime.split(':').map(Number)

    let current = new Date(date + 'T00:00:00')
    current.setHours(startH, startM, 0, 0)

    const end = new Date(date + 'T00:00:00')
    end.setHours(endH, endM, 0, 0)

    while (current.getTime() + service.durationMinutes * 60000 <= end.getTime()) {
      const slotStart = new Date(current)
      const slotEnd = new Date(current.getTime() + service.durationMinutes * 60000)
      slots.push({ startTime: slotStart, endTime: slotEnd })
      current = new Date(current.getTime() + service.durationMinutes * 60000)
    }
  } else {
    const dateStart = new Date(date + 'T00:00:00')
    const dateEnd = new Date(date + 'T23:59:59')

    const matchingFlexSlots = service.flexibleSlots.filter(
      (fs) =>
        fs.isActive &&
        fs.startDatetime <= dateEnd &&
        fs.endDatetime >= dateStart
    )

    if (matchingFlexSlots.length === 0) {
      return { slots: [], message: 'No slots configured for this date' }
    }

    for (const fs of matchingFlexSlots) {
      let current = new Date(Math.max(fs.startDatetime.getTime(), dateStart.getTime()))
      const end = new Date(Math.min(fs.endDatetime.getTime(), dateEnd.getTime()))

      while (current.getTime() + service.durationMinutes * 60000 <= end.getTime()) {
        const slotStart = new Date(current)
        const slotEnd = new Date(current.getTime() + service.durationMinutes * 60000)
        slots.push({ startTime: slotStart, endTime: slotEnd })
        current = new Date(current.getTime() + service.durationMinutes * 60000)
      }
    }
  }

  const results: SlotResult[] = []
  const now = new Date()

  for (const slot of slots) {
    if (slot.startTime <= now) continue

    const bookingWhere: any = {
      appointmentTypeId: serviceId,
      scheduledStart: slot.startTime,
      status: { notIn: ['CANCELLED'] },
    }
    if (resourceId) {
      bookingWhere.resourceId = resourceId
    }

    const existingBookings = await prisma.booking.findMany({ where: bookingWhere })
    const bookedCapacity = existingBookings.reduce((sum, b) => sum + b.capacity, 0)
    const availableCapacity = service.maxCapacityPerSlot - bookedCapacity

    if (availableCapacity > 0) {
      results.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        availableCapacity,
        isFull: false,
      })
    }
  }

  return { slots: results }
}
