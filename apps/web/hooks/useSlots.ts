'use client'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { SlotResult } from '../types'

export function useSlots(serviceId: string, date: string, resourceId?: string) {
  return useQuery<{ slots: SlotResult[]; message?: string }>({
    queryKey: ['slots', serviceId, date, resourceId],
    queryFn: async () => {
      const params: Record<string, string> = { serviceId, date }
      if (resourceId) params.resourceId = resourceId
      const res = await api.get('/slots/available', { params })
      return { slots: res.data.slots, message: res.data.message }
    },
    enabled: !!serviceId && !!date,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}
