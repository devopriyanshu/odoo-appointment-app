'use client'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface CustomerOption {
  id: string
  name: string
  email: string
  phone?: string | null
}

export function useCustomers(query?: string) {
  return useQuery<CustomerOption[]>({
    queryKey: ['customers', query ?? ''],
    queryFn: async () => {
      const res = await api.get('/users/customers', { params: query ? { q: query } : undefined })
      return res.data.customers
    },
    staleTime: 30_000,
  })
}
