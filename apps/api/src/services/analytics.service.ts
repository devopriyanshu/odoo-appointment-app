import { prisma } from '../config/database'

async function getServiceIds(organiserId?: string): Promise<string[] | undefined> {
  if (!organiserId) return undefined
  const services = await prisma.appointmentType.findMany({
    where: { organiserId },
    select: { id: true },
  })
  return services.map((s) => s.id)
}

export async function getSummary(organiserId?: string, role?: string) {
  const serviceIds = role === 'ORGANISER' ? await getServiceIds(organiserId) : undefined
  const where: Record<string, unknown> = serviceIds ? { appointmentTypeId: { in: serviceIds } } : {}

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [total, confirmed, pending, cancelled, completed, noShow, revenue] = await Promise.all([
    prisma.booking.count({ where: where as any }),
    prisma.booking.count({ where: { ...where, status: 'CONFIRMED' } as any }),
    prisma.booking.count({ where: { ...where, status: 'PENDING' } as any }),
    prisma.booking.count({ where: { ...where, status: 'CANCELLED' } as any }),
    prisma.booking.count({ where: { ...where, status: 'COMPLETED' } as any }),
    prisma.booking.count({ where: { ...where, status: 'NO_SHOW' } as any }),
    prisma.booking.aggregate({
      where: { ...where, paymentStatus: 'PAID', createdAt: { gte: monthStart } } as any,
      _sum: { paymentAmount: true },
    }),
  ])

  return {
    totalBookings: total,
    confirmedCount: confirmed,
    pendingCount: pending,
    cancelledCount: cancelled,
    completedCount: completed,
    noShowCount: noShow,
    revenueTotal: Number(revenue._sum.paymentAmount ?? 0),
  }
}

export async function getPeakHours(organiserId?: string, role?: string) {
  const serviceIds = role === 'ORGANISER' ? await getServiceIds(organiserId) : undefined

  const bookings = await prisma.booking.findMany({
    where: serviceIds ? { appointmentTypeId: { in: serviceIds } } : {},
    select: { scheduledStart: true },
  })

  const hourCounts: Record<number, number> = {}
  for (let i = 0; i < 24; i++) hourCounts[i] = 0
  bookings.forEach((b) => {
    const hour = new Date(b.scheduledStart).getHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  })

  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: parseInt(hour),
    count,
  }))
}

export async function getTrend(organiserId?: string, role?: string, days = 30) {
  const serviceIds = role === 'ORGANISER' ? await getServiceIds(organiserId) : undefined
  const from = new Date()
  from.setDate(from.getDate() - days)

  const bookings = await prisma.booking.findMany({
    where: {
      ...(serviceIds ? { appointmentTypeId: { in: serviceIds } } : {}),
      createdAt: { gte: from },
    },
    select: { createdAt: true },
  })

  const dateCounts: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dateCounts[d.toISOString().split('T')[0]] = 0
  }

  bookings.forEach((b) => {
    const date = b.createdAt.toISOString().split('T')[0]
    if (date in dateCounts) dateCounts[date] = (dateCounts[date] ?? 0) + 1
  })

  return Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getByService(organiserId?: string, role?: string) {
  const serviceIds = role === 'ORGANISER' ? await getServiceIds(organiserId) : undefined

  const services = await prisma.appointmentType.findMany({
    where: serviceIds ? { id: { in: serviceIds } } : {},
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        where: { paymentStatus: 'PAID' },
        select: { paymentAmount: true },
      },
    },
  })

  return services.map((s) => ({
    serviceName: s.name,
    count: s._count.bookings,
    revenue: s.bookings.reduce((sum, b) => sum + Number(b.paymentAmount ?? 0), 0),
  }))
}

export async function getProviderUtilization(organiserId?: string, role?: string) {
  const serviceIds = role === 'ORGANISER' ? await getServiceIds(organiserId) : undefined

  const resources = await prisma.resource.findMany({
    where: serviceIds ? { appointmentTypeId: { in: serviceIds } } : {},
    include: {
      _count: { select: { bookings: true } },
    },
  })

  const totalDays = 30
  return resources.map((r) => ({
    resourceName: r.name,
    bookingCount: r._count.bookings,
    utilization: Math.min(Math.round((r._count.bookings / (totalDays * 8)) * 100), 100),
  }))
}
