'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AnalyticsSummary } from '@/types'

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const r = await api.get('/analytics/summary')
      return r.data.data
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useAnalyticsTrend(days = 30) {
  return useQuery<{ date: string; count: number }[]>({
    queryKey: ['analytics', 'trend', days],
    queryFn: async () => {
      const r = await api.get('/analytics/trend', { params: { days } })
      return r.data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useAnalyticsPeakHours() {
  return useQuery<{ hour: number; count: number }[]>({
    queryKey: ['analytics', 'peak-hours'],
    queryFn: async () => {
      const r = await api.get('/analytics/peak-hours')
      return r.data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useAnalyticsByService() {
  return useQuery<{ serviceName: string; count: number; revenue: number }[]>({
    queryKey: ['analytics', 'by-service'],
    queryFn: async () => {
      const r = await api.get('/analytics/by-service')
      return r.data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useAnalyticsProviderUtilization() {
  return useQuery<{ resourceName: string; bookingCount: number; utilization: number }[]>({
    queryKey: ['analytics', 'provider-utilization'],
    queryFn: async () => {
      const r = await api.get('/analytics/provider-utilization')
      return r.data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
