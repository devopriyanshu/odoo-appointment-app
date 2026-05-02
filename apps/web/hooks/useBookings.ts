'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../lib/api'
import type { Booking } from '../types'

interface BookingFilters {
  status?: string
  serviceId?: string
  page?: number
  limit?: number
  from?: string
  to?: string
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery<{ bookings: Booking[]; total: number; page: number }>({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: filters })
      return res.data
    },
  })
}

export function useBooking(id: string) {
  return useQuery<Booking>({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`)
      return res.data.booking
    },
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      appointmentTypeId: string
      resourceId?: string
      scheduledStart: string
      capacity?: number
      answers?: Array<{ questionId: string; answer: string }>
      paymentReference?: string
      customerId?: string
    }) => {
      const res = await api.post('/bookings', data)
      return res.data.booking as Booking
    },
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
      toast.success('Booking confirmed!')
      return booking
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Booking failed'
      toast.error(msg)
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cancelReason }: { id: string; cancelReason?: string }) => {
      const res = await api.patch(`/bookings/${id}/cancel`, { cancelReason })
      return res.data.booking
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Appointment cancelled')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cancellation failed'
      toast.error(msg)
    },
  })
}

export function useRescheduleBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, scheduledStart }: { id: string; scheduledStart: string }) => {
      const res = await api.patch(`/bookings/${id}/reschedule`, { scheduledStart })
      return res.data.booking
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Appointment rescheduled')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Reschedule failed'
      toast.error(msg)
    },
  })
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'confirm' | 'complete' | 'no-show' }) => {
      const res = await api.patch(`/bookings/${id}/${action}`)
      return res.data.booking
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      toast.success(`Booking ${vars.action}ed`)
    },
  })
}
