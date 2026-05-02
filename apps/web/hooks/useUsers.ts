'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  phone?: string
  createdAt: string
}

export function useUsers(options?: { enabled?: boolean }) {
  return useQuery<{ users: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users')
      return res.data
    },
    enabled: options?.enabled,
    staleTime: 0,
    refetchOnMount: true,
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch(`/users/${id}`, { isActive })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User status updated')
    },
    onError: () => toast.error('Failed to update user status'),
  })
}

export function useChangeUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await api.patch(`/users/${id}/role`, { role })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated')
    },
    onError: () => toast.error('Failed to deactivate user'),
  })
}
