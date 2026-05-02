'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Calendar, ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { useForgotPassword } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [submitted, setSubmitted] = useState(false)
  const [resetToken, setResetToken] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const result = await forgotPassword.mutateAsync(data).catch(() => null)
    if (result) {
      setSubmitted(true)
      if (result.resetToken) setResetToken(result.resetToken)
    }
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
            AppointmentPro
          </span>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          {!submitted ? (
            <>
              <Link href="/login" className="flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--brand-accent)' }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                Forgot password?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    <Mail size={14} className="inline mr-1" /> Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  {errors.email && <p className="text-xs mt-1 text-red-400">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={forgotPassword.isPending}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--brand-accent)' }}
                >
                  {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
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
                Check your email
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                If that email exists in our system, we&apos;ve sent a password reset link.
              </p>

              {resetToken && (
                <div className="rounded-xl p-3 text-xs mb-4" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Demo mode:</p>
                  <Link href={`/reset-password?token=${resetToken}`}
                    className="font-medium underline" style={{ color: 'var(--brand-accent)' }}>
                    Click here to reset your password
                  </Link>
                </div>
              )}

              <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--brand-accent)' }}>
                ← Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
