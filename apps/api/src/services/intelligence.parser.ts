import { addDays, addMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { z } from 'zod'
import type { QuerySpec, Metric, GroupBy, ChartHint } from './intelligence.service'
import { env } from '../config/env'
import axios from 'axios'
import { logger } from '../utils/logger'
import { prisma } from '../config/database'

const METRIC_PATTERNS: Array<[Metric, RegExp]> = [
  ['revenue', /\b(revenue|earning|earnings|sales|income|paid|payment)s?\b/i],
  ['noShowRate', /\b(no.?show|missed|didn'?t.show)/i],
  ['cancelRate', /\b(cancel(?:l(?:ation|ed))?)/i],
  ['completionRate', /\b(complete|completion|finished|done)/i],
  ['customers', /\b(customer|client|user|patient)s?\b/i],
  ['utilization', /\b(util|occupancy|capacity)/i],
  ['avgLeadTime', /\b(lead.?time|book.?ahead|advance)/i],
  ['bookings', /\b(booking|appointment|slot)s?\b/i],
]

const GROUP_PATTERNS: Array<[GroupBy, RegExp]> = [
  ['service', /\b(by|per|each)\s+(service|type)/i],
  ['provider', /\b(by|per|each)\s+(provider|doctor|staff|resource)/i],
  ['category', /\b(by|per|each)\s+categor/i],
  ['hour', /\b(by|per|each)\s+hour|peak\s+hour/i],
  ['dayOfWeek', /\b(by|per|each)\s+(day.of.?week|weekday)|\bweekly pattern/i],
  ['day', /\b(daily|by day|per day|each day|over time|trend)/i],
  ['week', /\b(weekly|by week|per week|each week)/i],
  ['month', /\b(monthly|by month|per month|each month)/i],
  ['status', /\b(by|per)\s+status|status mix|status breakdown/i],
  ['customer', /\btop\s+customers?\b|\b(by|per)\s+customer\b/i],
]

const CHART_PATTERNS: Array<[ChartHint, RegExp]> = [
  ['line', /\b(line|trend over time)\b/i],
  ['bar', /\b(bar)\b/i],
  ['pie', /\b(pie|donut)\b/i],
  ['table', /\b(table|list|raw|detail(?:s)?)\b/i],
]

function extractDateRange(text: string): { from?: string; to?: string } {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

  const lastN = text.match(/last\s+(\d+)\s+(day|week|month)s?/i)
  if (lastN) {
    const n = parseInt(lastN[1], 10)
    const unit = lastN[2].toLowerCase()
    const days = unit === 'day' ? n : unit === 'week' ? n * 7 : n * 30
    return { from: format(addDays(now, -days), 'yyyy-MM-dd'), to: today }
  }

  if (/\b(last|past)\s+month\b/i.test(text)) {
    const start = startOfMonth(addMonths(now, -1))
    const end = endOfMonth(addMonths(now, -1))
    return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') }
  }
  if (/\b(this|current)\s+month\b/i.test(text)) {
    return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: today }
  }
  if (/\b(last|past)\s+week\b/i.test(text)) {
    const start = startOfWeek(addDays(now, -7))
    const end = endOfWeek(addDays(now, -7))
    return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') }
  }
  if (/\b(this|current)\s+week\b/i.test(text)) {
    return { from: format(startOfWeek(now), 'yyyy-MM-dd'), to: today }
  }
  if (/\b(today)\b/i.test(text)) {
    return { from: today, to: today }
  }
  if (/\b(yesterday)\b/i.test(text)) {
    const y = format(addDays(now, -1), 'yyyy-MM-dd')
    return { from: y, to: y }
  }
  if (/\b(this|current)\s+year\b/i.test(text)) {
    return { from: `${now.getFullYear()}-01-01`, to: today }
  }
  // ISO range "from 2026-04-01 to 2026-05-01"
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|until|-)\s*(\d{4}-\d{2}-\d{2})/i)
  if (isoRange) return { from: isoRange[1], to: isoRange[2] }

  return {}
}

async function extractServiceFilter(text: string, organiserId: string, isAdmin: boolean): Promise<string[] | undefined> {
  const lower = text.toLowerCase()
  const services = await prisma.appointmentType.findMany({
    where: isAdmin ? {} : { organiserId },
    select: { id: true, name: true },
    take: 50,
  })
  const matches: string[] = []
  for (const s of services) {
    const name = s.name.toLowerCase()
    if (lower.includes(name)) {
      matches.push(s.id)
      continue
    }
    const word = name.split(/\s+/).find((w) => w.length > 3)
    if (word && new RegExp(`\\b${word}\\b`, 'i').test(lower)) {
      matches.push(s.id)
    }
  }
  return matches.length ? matches : undefined
}

export async function parsePromptToSpec(
  prompt: string,
  user: { id: string; role: string }
): Promise<QuerySpec | null> {
  const text = prompt.trim()
  if (!text) return null

  // Metric (first match wins, ordered most-specific to least)
  let metric: Metric | undefined
  for (const [m, re] of METRIC_PATTERNS) {
    if (re.test(text)) { metric = m; break }
  }
  if (!metric) return null

  let groupBy: GroupBy | undefined
  for (const [g, re] of GROUP_PATTERNS) {
    if (re.test(text)) { groupBy = g; break }
  }

  let chartHint: ChartHint | undefined
  for (const [c, re] of CHART_PATTERNS) {
    if (re.test(text)) { chartHint = c; break }
  }

  const range = extractDateRange(text)
  const serviceIds = await extractServiceFilter(text, user.id, user.role === 'ADMIN')

  const limitMatch = text.match(/\b(?:top|last)\s+(\d+)\b(?!\s+(?:day|week|month))/i)
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : undefined

  return {
    metric,
    groupBy,
    from: range.from,
    to: range.to,
    filters: serviceIds ? { serviceIds } : undefined,
    limit,
    chartHint,
  }
}

const SPEC_SCHEMA = z.object({
  metric: z.enum(['bookings', 'revenue', 'customers', 'noShowRate', 'cancelRate', 'completionRate', 'utilization', 'avgLeadTime']),
  groupBy: z.enum(['day', 'week', 'month', 'service', 'provider', 'category', 'hour', 'dayOfWeek', 'status', 'customer']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  filters: z.object({
    serviceIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
  }).optional(),
  limit: z.number().int().positive().max(100).optional(),
  chartHint: z.enum(['line', 'bar', 'pie', 'kpi', 'table']).optional(),
})

export function validateSpec(input: unknown): QuerySpec {
  return SPEC_SCHEMA.parse(input) as QuerySpec
}

/**
 * LLM fallback: ask Sarvam to produce a JSON spec when regex parsing fails.
 * Returns null if no API key configured or model output unusable.
 */
export async function llmParse(prompt: string): Promise<QuerySpec | null> {
  if (!env.SARVAM_API_KEY) return null
  const system = `You convert business analytics questions into a strict JSON spec.

Output ONLY a JSON object — no prose, no markdown — matching this TypeScript:
{
  "metric": "bookings"|"revenue"|"customers"|"noShowRate"|"cancelRate"|"completionRate"|"utilization"|"avgLeadTime",
  "groupBy"?: "day"|"week"|"month"|"service"|"provider"|"category"|"hour"|"dayOfWeek"|"status"|"customer",
  "from"?: "YYYY-MM-DD",
  "to"?: "YYYY-MM-DD",
  "limit"?: number,
  "chartHint"?: "line"|"bar"|"pie"|"kpi"|"table"
}

Rules:
- If the user mentions a time range, fill from/to. Today is ${format(new Date(), 'yyyy-MM-dd')}.
- If unsure about metric, default to "bookings".
- Never invent service names or filter IDs.`

  try {
    const res = await axios.post(`${env.SARVAM_API_BASE}/v1/chat/completions`, {
      model: 'sarvam-m',
      messages: [{ role: 'user', content: prompt }],
      system,
    }, {
      headers: { 'api-subscription-key': env.SARVAM_API_KEY },
      timeout: 15000,
    })
    const text: string = res.data?.choices?.[0]?.message?.content ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return validateSpec(parsed)
  } catch (err) {
    logger.warn('intelligence LLM parse failed', { err: (err as Error).message })
    return null
  }
}
