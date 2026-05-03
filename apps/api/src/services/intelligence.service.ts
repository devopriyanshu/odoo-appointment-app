import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'

export type Metric =
  | 'bookings'
  | 'revenue'
  | 'customers'
  | 'noShowRate'
  | 'cancelRate'
  | 'completionRate'
  | 'utilization'
  | 'avgLeadTime'

export type GroupBy =
  | 'day'
  | 'week'
  | 'month'
  | 'service'
  | 'provider'
  | 'category'
  | 'hour'
  | 'dayOfWeek'
  | 'status'
  | 'customer'

export type ChartHint = 'line' | 'bar' | 'pie' | 'kpi' | 'table'

export interface QuerySpec {
  metric: Metric
  groupBy?: GroupBy
  from?: string
  to?: string
  filters?: {
    serviceIds?: string[]
    categoryIds?: string[]
    status?: string[]
  }
  limit?: number
  chartHint?: ChartHint
}

export interface ReportRow {
  key: string
  label: string
  value: number
  meta?: Record<string, unknown>
}

export interface ReportResult {
  spec: QuerySpec
  data: ReportRow[]
  summary: {
    label: string
    value: number | string
    delta?: number
    deltaLabel?: string
  }
  chartHint: ChartHint
  title: string
  description?: string
}

const METRIC_LABELS: Record<Metric, string> = {
  bookings: 'Bookings',
  revenue: 'Revenue',
  customers: 'Customers',
  noShowRate: 'No-show rate',
  cancelRate: 'Cancellation rate',
  completionRate: 'Completion rate',
  utilization: 'Utilization',
  avgLeadTime: 'Avg lead time (hrs)',
}

const GROUP_LABELS: Record<GroupBy, string> = {
  day: 'day', week: 'week', month: 'month',
  service: 'service', provider: 'provider', category: 'category',
  hour: 'hour', dayOfWeek: 'day of week',
  status: 'status', customer: 'customer',
}

function resolveDateRange(spec: QuerySpec) {
  const to = spec.to ? endOfDay(new Date(spec.to)) : endOfDay(new Date())
  const from = spec.from ? startOfDay(new Date(spec.from)) : startOfDay(addDays(to, -29))
  return { from, to }
}

function previousRange(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime()
  return { prevFrom: new Date(from.getTime() - ms - 1), prevTo: new Date(from.getTime() - 1) }
}

function isAdmin(role?: string) {
  return role === 'ADMIN'
}

/** Build a Prisma WHERE clause scoped to the organiser (or no scope if admin). */
function bookingScope(organiserId: string, role: string | undefined, spec: QuerySpec) {
  const where: Prisma.BookingWhereInput = {}
  if (!isAdmin(role)) {
    where.appointmentType = { organiserId }
  }
  if (spec.filters?.serviceIds?.length) {
    where.appointmentTypeId = { in: spec.filters.serviceIds }
  }
  if (spec.filters?.categoryIds?.length) {
    where.appointmentType = {
      ...(where.appointmentType as object),
      categoryId: { in: spec.filters.categoryIds },
    }
  }
  if (spec.filters?.status?.length) {
    where.status = { in: spec.filters.status as Prisma.EnumBookingStatusFilter['in'] }
  }
  return where
}

function applyDateFilter(where: Prisma.BookingWhereInput, from: Date, to: Date) {
  return { ...where, scheduledStart: { gte: from, lte: to } }
}

// =====================================================================
// Headline (KPI) computations
// =====================================================================

async function headline(metric: Metric, where: Prisma.BookingWhereInput): Promise<number> {
  switch (metric) {
    case 'bookings': {
      return prisma.booking.count({ where: { ...where, status: { not: 'CANCELLED' } } })
    }
    case 'revenue': {
      const r = await prisma.booking.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { paymentAmount: true },
      })
      return Number(r._sum.paymentAmount ?? 0)
    }
    case 'customers': {
      const rows = await prisma.booking.findMany({
        where, select: { customerId: true }, distinct: ['customerId'],
      })
      return rows.length
    }
    case 'noShowRate': {
      const total = await prisma.booking.count({ where })
      if (!total) return 0
      const ns = await prisma.booking.count({ where: { ...where, status: 'NO_SHOW' } })
      return +(ns / total * 100).toFixed(2)
    }
    case 'cancelRate': {
      const total = await prisma.booking.count({ where })
      if (!total) return 0
      const c = await prisma.booking.count({ where: { ...where, status: 'CANCELLED' } })
      return +(c / total * 100).toFixed(2)
    }
    case 'completionRate': {
      const total = await prisma.booking.count({ where })
      if (!total) return 0
      const done = await prisma.booking.count({ where: { ...where, status: 'COMPLETED' } })
      return +(done / total * 100).toFixed(2)
    }
    case 'utilization': {
      // simple proxy: bookings count / (services * working_days_in_range * avg_slots_per_day)
      // For v1: bookings vs total slots scheduled in active services
      const bookings = await prisma.booking.count({ where: { ...where, status: { not: 'CANCELLED' } } })
      const services = await prisma.appointmentType.count({
        where: where.appointmentType ? { ...(where.appointmentType as object) } : undefined,
      })
      if (!services) return 0
      // Approx: 6 hours * 2 slots/hour * 22 working days
      const theoretical = services * 264
      return +(bookings / theoretical * 100).toFixed(2)
    }
    case 'avgLeadTime': {
      const rows = await prisma.booking.findMany({
        where, select: { createdAt: true, scheduledStart: true },
      })
      if (!rows.length) return 0
      const totalMs = rows.reduce((s, b) => s + (b.scheduledStart.getTime() - b.createdAt.getTime()), 0)
      return +((totalMs / rows.length) / 3600000).toFixed(2)
    }
  }
}

// =====================================================================
// Group-by aggregations
// =====================================================================

async function groupedBookings(where: Prisma.BookingWhereInput, groupBy: GroupBy, limit?: number): Promise<ReportRow[]> {
  // Date / time groupings use raw SQL via $queryRaw for portability
  if (['day', 'week', 'month', 'hour', 'dayOfWeek'].includes(groupBy)) {
    const truncMap: Record<string, string> = {
      day: "DATE_TRUNC('day', \"scheduledStart\")",
      week: "DATE_TRUNC('week', \"scheduledStart\")",
      month: "DATE_TRUNC('month', \"scheduledStart\")",
      hour: "EXTRACT(HOUR FROM \"scheduledStart\")",
      dayOfWeek: "EXTRACT(DOW FROM \"scheduledStart\")",
    }
    const expr = truncMap[groupBy]
    // Apply organiser scope inline for raw SQL
    const orgFilter = where.appointmentType
      ? Prisma.sql`AND b."appointmentTypeId" IN (SELECT id FROM "AppointmentType" WHERE "organiserId" = ${(where.appointmentType as { organiserId: string }).organiserId})`
      : Prisma.empty
    const dateFilter = where.scheduledStart && (where.scheduledStart as { gte: Date }).gte
      ? Prisma.sql`AND b."scheduledStart" BETWEEN ${(where.scheduledStart as { gte: Date }).gte} AND ${(where.scheduledStart as { lte: Date }).lte}`
      : Prisma.empty
    const statusFilter = Prisma.sql`AND b."status" != 'CANCELLED'`
    const rows = await prisma.$queryRaw<Array<{ k: Date | number; v: bigint }>>(Prisma.sql`
      SELECT ${Prisma.raw(expr)} as k, COUNT(*)::bigint as v
      FROM "Booking" b
      WHERE 1=1 ${orgFilter} ${dateFilter} ${statusFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `)
    return rows.map((r) => {
      let key = ''
      let label = ''
      if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
        const d = r.k as Date
        key = format(d, 'yyyy-MM-dd')
        label = groupBy === 'month' ? format(d, 'MMM yyyy') : groupBy === 'week' ? `wk ${format(d, 'MMM d')}` : format(d, 'MMM d')
      } else if (groupBy === 'hour') {
        const h = Number(r.k)
        key = String(h)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const hh = h % 12 === 0 ? 12 : h % 12
        label = `${hh} ${ampm}`
      } else {
        const d = Number(r.k)
        key = String(d)
        label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? String(d)
      }
      return { key, label, value: Number(r.v) }
    })
  }

  // Category-based groupings via Prisma groupBy
  if (groupBy === 'service') {
    const rows = await prisma.booking.groupBy({
      by: ['appointmentTypeId'],
      where: { ...where, status: { not: 'CANCELLED' } },
      _count: { _all: true },
      orderBy: { _count: { appointmentTypeId: 'desc' } },
      take: limit ?? 20,
    })
    const ids = rows.map((r) => r.appointmentTypeId)
    const services = await prisma.appointmentType.findMany({
      where: { id: { in: ids } }, select: { id: true, name: true },
    })
    const nameMap = new Map(services.map((s) => [s.id, s.name]))
    return rows.map((r) => ({
      key: r.appointmentTypeId, label: nameMap.get(r.appointmentTypeId) || 'Service',
      value: r._count._all,
    }))
  }

  if (groupBy === 'provider') {
    const rows = await prisma.booking.groupBy({
      by: ['resourceId'],
      where: { ...where, status: { not: 'CANCELLED' }, resourceId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { resourceId: 'desc' } },
      take: limit ?? 20,
    })
    const ids = rows.map((r) => r.resourceId).filter((x): x is string => !!x)
    const resources = await prisma.resource.findMany({
      where: { id: { in: ids } }, select: { id: true, name: true },
    })
    const map = new Map(resources.map((r) => [r.id, r.name]))
    return rows.map((r) => ({
      key: r.resourceId ?? '', label: map.get(r.resourceId ?? '') || 'Provider',
      value: r._count._all,
    }))
  }

  if (groupBy === 'category') {
    const services = await prisma.appointmentType.findMany({
      where: where.appointmentType ? { ...(where.appointmentType as object) } : {},
      select: { id: true, category: { select: { id: true, name: true, color: true } } },
    })
    const idToCat = new Map(services.map((s) => [s.id, s.category]))
    const all = await prisma.booking.findMany({ where: { ...where, status: { not: 'CANCELLED' } }, select: { appointmentTypeId: true } })
    const counts = new Map<string, { name: string; color?: string | null; count: number }>()
    for (const b of all) {
      const cat = idToCat.get(b.appointmentTypeId)
      const key = cat?.id ?? 'uncategorised'
      const name = cat?.name ?? 'Uncategorised'
      const cur = counts.get(key) ?? { name, color: cat?.color, count: 0 }
      cur.count += 1
      counts.set(key, cur)
    }
    return Array.from(counts.entries())
      .map(([key, v]) => ({ key, label: v.name, value: v.count, meta: { color: v.color } }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit ?? 20)
  }

  if (groupBy === 'status') {
    const rows = await prisma.booking.groupBy({
      by: ['status'], where, _count: { _all: true },
    })
    return rows.map((r) => ({ key: r.status, label: r.status, value: r._count._all }))
  }

  if (groupBy === 'customer') {
    const rows = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { ...where, status: { not: 'CANCELLED' } },
      _count: { _all: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: limit ?? 10,
    })
    const ids = rows.map((r) => r.customerId)
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    const map = new Map(users.map((u) => [u.id, u]))
    return rows.map((r) => ({
      key: r.customerId,
      label: map.get(r.customerId)?.name || 'Customer',
      value: r._count._all,
      meta: { email: map.get(r.customerId)?.email },
    }))
  }

  return []
}

async function groupedRevenue(where: Prisma.BookingWhereInput, groupBy: GroupBy): Promise<ReportRow[]> {
  if (['day', 'week', 'month'].includes(groupBy)) {
    const truncMap: Record<string, string> = {
      day: "DATE_TRUNC('day', \"scheduledStart\")",
      week: "DATE_TRUNC('week', \"scheduledStart\")",
      month: "DATE_TRUNC('month', \"scheduledStart\")",
    }
    const expr = truncMap[groupBy]
    const orgFilter = where.appointmentType
      ? Prisma.sql`AND b."appointmentTypeId" IN (SELECT id FROM "AppointmentType" WHERE "organiserId" = ${(where.appointmentType as { organiserId: string }).organiserId})`
      : Prisma.empty
    const dateFilter = where.scheduledStart && (where.scheduledStart as { gte: Date }).gte
      ? Prisma.sql`AND b."scheduledStart" BETWEEN ${(where.scheduledStart as { gte: Date }).gte} AND ${(where.scheduledStart as { lte: Date }).lte}`
      : Prisma.empty
    const rows = await prisma.$queryRaw<Array<{ k: Date; v: number | null }>>(Prisma.sql`
      SELECT ${Prisma.raw(expr)} as k, SUM("paymentAmount")::float as v
      FROM "Booking" b
      WHERE "paymentStatus" = 'PAID' ${orgFilter} ${dateFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `)
    return rows.map((r) => ({
      key: format(r.k, 'yyyy-MM-dd'),
      label: groupBy === 'month' ? format(r.k, 'MMM yyyy') : groupBy === 'week' ? `wk ${format(r.k, 'MMM d')}` : format(r.k, 'MMM d'),
      value: Number(r.v ?? 0),
    }))
  }

  if (groupBy === 'service') {
    const rows = await prisma.booking.groupBy({
      by: ['appointmentTypeId'],
      where: { ...where, paymentStatus: 'PAID' },
      _sum: { paymentAmount: true },
      orderBy: { _sum: { paymentAmount: 'desc' } },
      take: 20,
    })
    const services = await prisma.appointmentType.findMany({
      where: { id: { in: rows.map((r) => r.appointmentTypeId) } },
      select: { id: true, name: true },
    })
    const map = new Map(services.map((s) => [s.id, s.name]))
    return rows.map((r) => ({
      key: r.appointmentTypeId,
      label: map.get(r.appointmentTypeId) || 'Service',
      value: Number(r._sum.paymentAmount ?? 0),
    }))
  }

  return []
}

// =====================================================================
// Public entry point
// =====================================================================

export async function runReport(spec: QuerySpec, user: { id: string; role: string }): Promise<ReportResult> {
  const { from, to } = resolveDateRange(spec)
  const baseWhere = bookingScope(user.id, user.role, spec)
  const dated = applyDateFilter(baseWhere, from, to)

  // Headline KPI
  const headlineValue = await headline(spec.metric, dated)

  // Period-over-period delta
  let delta: number | undefined
  let deltaLabel: string | undefined
  try {
    const { prevFrom, prevTo } = previousRange(from, to)
    const prevWhere = applyDateFilter(baseWhere, prevFrom, prevTo)
    const prev = await headline(spec.metric, prevWhere)
    if (prev > 0) {
      delta = +(((headlineValue - prev) / prev) * 100).toFixed(1)
      deltaLabel = `vs prev period`
    }
  } catch {
    // ignore
  }

  // Grouped data
  let data: ReportRow[] = []
  let chartHint: ChartHint = spec.chartHint ?? 'kpi'

  if (spec.groupBy) {
    if (spec.metric === 'revenue') {
      data = await groupedRevenue(dated, spec.groupBy)
    } else if (spec.metric === 'bookings' || spec.metric === 'customers') {
      data = await groupedBookings(dated, spec.groupBy, spec.limit)
    } else if (['noShowRate', 'cancelRate', 'completionRate'].includes(spec.metric)) {
      // Compute rate per group: need totals + numerators by group
      const totals = await groupedBookings(dated, spec.groupBy, spec.limit)
      const numStatus = spec.metric === 'noShowRate' ? 'NO_SHOW'
        : spec.metric === 'cancelRate' ? 'CANCELLED' : 'COMPLETED'
      const numWhere: Prisma.BookingWhereInput = { ...dated, status: numStatus as Prisma.EnumBookingStatusFilter['equals'] }
      const nums = await groupedBookings(numWhere, spec.groupBy, spec.limit)
      const numMap = new Map(nums.map((n) => [n.key, n.value]))
      data = totals.map((t) => ({
        key: t.key, label: t.label,
        value: t.value > 0 ? +(((numMap.get(t.key) ?? 0) / t.value) * 100).toFixed(2) : 0,
      }))
    }

    if (!spec.chartHint) {
      if (['day', 'week', 'month', 'hour', 'dayOfWeek'].includes(spec.groupBy)) chartHint = 'line'
      else if (spec.groupBy === 'status') chartHint = 'pie'
      else chartHint = 'bar'
    }
  }

  const title = buildTitle(spec)
  return {
    spec: { ...spec, from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') },
    data,
    summary: {
      label: METRIC_LABELS[spec.metric],
      value: formatHeadline(spec.metric, headlineValue),
      delta,
      deltaLabel,
    },
    chartHint,
    title,
  }
}

function buildTitle(spec: QuerySpec): string {
  const m = METRIC_LABELS[spec.metric]
  if (spec.groupBy) return `${m} by ${GROUP_LABELS[spec.groupBy]}`
  return m
}

function formatHeadline(metric: Metric, value: number): string {
  if (metric === 'revenue') return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  if (['noShowRate', 'cancelRate', 'completionRate', 'utilization'].includes(metric)) return `${value}%`
  if (metric === 'avgLeadTime') return `${value} h`
  return value.toLocaleString('en-IN')
}

/**
 * Build a list of headline KPIs for the dashboard "stat row".
 * Always returns: bookings, revenue, customers, noShowRate for the last 30 days.
 */
export async function getHeadlineKPIs(user: { id: string; role: string }): Promise<ReportResult[]> {
  const metrics: Metric[] = ['bookings', 'revenue', 'customers', 'noShowRate']
  return Promise.all(metrics.map((metric) => runReport({ metric, chartHint: 'kpi' }, user)))
}
