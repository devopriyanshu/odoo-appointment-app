'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../lib/api'

export type Metric =
  | 'bookings' | 'revenue' | 'customers'
  | 'noShowRate' | 'cancelRate' | 'completionRate'
  | 'utilization' | 'avgLeadTime'

export type GroupBy =
  | 'day' | 'week' | 'month'
  | 'service' | 'provider' | 'category'
  | 'hour' | 'dayOfWeek' | 'status' | 'customer'

export type ChartHint = 'line' | 'bar' | 'pie' | 'kpi' | 'table'

export interface QuerySpec {
  metric: Metric
  groupBy?: GroupBy
  from?: string
  to?: string
  filters?: { serviceIds?: string[]; categoryIds?: string[]; status?: string[] }
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
  summary: { label: string; value: number | string; delta?: number; deltaLabel?: string }
  chartHint: ChartHint
  title: string
  description?: string
  parsedFrom?: 'spec' | 'regex' | 'llm'
}

export function useHeadlineKPIs() {
  return useQuery<ReportResult[]>({
    queryKey: ['bi', 'headlines'],
    queryFn: async () => {
      const res = await api.get('/intelligence/headlines')
      return res.data.kpis
    },
    staleTime: 60_000,
  })
}

export function useRunQuery() {
  return useMutation<ReportResult, unknown, { prompt?: string; spec?: QuerySpec }>({
    mutationFn: async (body) => {
      const res = await api.post('/intelligence/query', body)
      return res.data
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not run report'
      toast.error(msg)
    },
  })
}
