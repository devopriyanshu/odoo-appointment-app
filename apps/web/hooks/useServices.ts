'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../lib/api'
import type { AppointmentType } from '../types'

export function useServices() {
  return useQuery<AppointmentType[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/services')
      return res.data.services
    },
  })
}

export function useService(id: string) {
  return useQuery<AppointmentType>({
    queryKey: ['services', id],
    queryFn: async () => {
      const res = await api.get(`/services/${id}`)
      return res.data.service
    },
    enabled: !!id,
  })
}

export function useServiceByToken(token: string) {
  return useQuery<AppointmentType>({
    queryKey: ['services', 'share', token],
    queryFn: async () => {
      const res = await api.get(`/services/share/${token}`)
      return res.data.service
    },
    enabled: !!token,
  })
}

export function useMyServices() {
  return useQuery<AppointmentType[]>({
    queryKey: ['services', 'mine'],
    queryFn: async () => {
      const res = await api.get('/services/mine')
      return res.data.services
    },
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<AppointmentType>) => {
      const res = await api.post('/services', data)
      return res.data.service
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service created successfully')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create service'
      toast.error(msg)
    },
  })
}

export function useUpdateService(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<AppointmentType>) => {
      const res = await api.patch(`/services/${id}`, data)
      return res.data.service
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service updated')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update service'
      toast.error(msg)
    },
  })
}

export function useTogglePublish(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/services/${id}/publish`)
      return res.data.service
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success(s.isPublished ? 'Service published' : 'Service unpublished')
    },
  })
}

export function useSetWorkingHours(serviceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) => {
      const res = await api.post(`/services/${serviceId}/working-hours`, { hours })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services', serviceId] })
      toast.success('Working hours saved')
    },
  })
}

export function useAddQuestion(serviceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { question: string; isRequired: boolean; sequence: number }) => {
      const res = await api.post(`/services/${serviceId}/questions`, data)
      return res.data.question
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services', serviceId] })
      toast.success('Question added')
    },
  })
}

export function useRemoveQuestion(serviceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (questionId: string) => {
      await api.delete(`/services/${serviceId}/questions/${questionId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services', serviceId] })
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service deleted')
    },
  })
}
