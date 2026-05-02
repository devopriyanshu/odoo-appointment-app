'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
      return res.data.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post('/auth/login', data)
      return res.data
    },
    onSuccess: (data) => {
      setUser(data.user)
      toast.success('Logged in successfully')
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
      toast.error(msg)
    },
  })
}

export function useSignup() {
  return useMutation({
    mutationFn: async (data: {
      name: string
      email: string
      password: string
      phone?: string
      role: string
    }) => {
      const res = await api.post('/auth/signup', data)
      return res.data
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Signup failed'
      toast.error(msg)
    },
  })
}

export function useVerifyOtp() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: async (data: { otpToken: string; otp: string }) => {
      const res = await api.post('/auth/verify-otp', data)
      return res.data
    },
    onSuccess: (data) => {
      setUser(data.user)
      toast.success('Account verified!')
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'OTP verification failed'
      toast.error(msg)
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout')
    },
    onSuccess: () => {
      clearAuth()
      qc.clear()
      window.location.href = '/login'
    },
  })
}
