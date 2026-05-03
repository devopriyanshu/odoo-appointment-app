'use client'
import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import { useResetPassword } from '@/hooks/useAuth'

const schema = z.object({
  password: z.string().min(8, 'Min 8 chars'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const resetPassword = useResetPassword()
  const [showPw, setShowPw] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) return
    const result = await resetPassword.mutateAsync({ token, password: data.password }).catch(() => null)
    if (result !== null) setSuccess(true)
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--brand-primary)' }}>
        <div className="rounded-2xl p-8 text-center max-w-md" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            Invalid Reset Link
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            This link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password"
            className="text-sm font-medium" style={{ color: 'var(--brand-accent)' }}>
            Request new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--brand-primary)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-3" style={{ background: 'var(--brand-accent)' }}>
            <Calendar size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            AppointEase
          </span>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          {!success ? (
            <>
              <Link href="/login" className="flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--brand-accent)' }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                Set new password
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>New Password</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min 8 chars"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs mt-1 text-red-400">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  {errors.confirmPassword && <p className="text-xs mt-1 text-red-400">{errors.confirmPassword.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={resetPassword.isPending}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--brand-accent)' }}
                >
                  {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0,212,170,0.15)' }}>
                <CheckCircle size={32} style={{ color: '#00d4aa' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                Password Reset!
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Your password has been successfully updated.
              </p>
              <button onClick={() => router.push('/login')}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--brand-accent)' }}>
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
        <div className="animate-spin h-8 w-8 rounded-full border-2" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}
