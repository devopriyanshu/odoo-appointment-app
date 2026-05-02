'use client'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Calendar } from 'lucide-react'
import { useSignup, useVerifyOtp } from '@/hooks/useAuth'

const signupSchema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 chars')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/[0-9]/, 'Needs number')
    .regex(/[^a-zA-Z0-9]/, 'Needs special char'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'ORGANISER']),
})
type SignupData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const signup = useSignup()
  const verifyOtp = useVerifyOtp()
  const [step, setStep] = useState<1 | 2>(1)
  const [otpToken, setOtpToken] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [showPw, setShowPw] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'CUSTOMER' },
  })

  const onSignup = async (data: SignupData) => {
    const result = await signup.mutateAsync(data).catch(() => null)
    if (result?.otpToken) {
      setOtpToken(result.otpToken)
      setStep(2)
    }
  }

  const onVerifyOtp = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) return
    const result = await verifyOtp.mutateAsync({ otpToken, otp: otpString }).catch(() => null)
    if (result) router.push('/')
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--brand-primary)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-3" style={{ background: 'var(--brand-accent)' }}>
            <Calendar size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            AppointmentPro
          </span>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          {step === 1 ? (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                Create your account
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Join AppointmentPro today</p>

              <form onSubmit={handleSubmit(onSignup)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                  <input {...register('name')} placeholder="Dr. John Smith"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  {errors.name && <p className="text-xs mt-1 text-red-400">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input {...register('email')} type="email" placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  {errors.email && <p className="text-xs mt-1 text-red-400">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                  <div className="relative">
                    <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Min 8 chars, uppercase, number, symbol"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs mt-1 text-red-400">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Phone (optional)</label>
                  <input {...register('phone')} placeholder="+91 9876543210"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>I am a</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['CUSTOMER', 'ORGANISER'] as const).map((r) => (
                      <label key={r} className="relative cursor-pointer">
                        <input {...register('role')} type="radio" value={r} className="sr-only" />
                        <div className={`px-4 py-3 rounded-xl text-sm font-medium text-center transition-all border ${watch('role') === r ? 'text-white' : 'border-[var(--border-color)]'}`}
                          style={watch('role') === r ? { background: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' } : { background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                          {r === 'CUSTOMER' ? '👤 Customer' : '🏥 Provider'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={signup.isPending}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--brand-accent)' }}>
                  {signup.isPending ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                Verify your email
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter the 6-digit code sent to your email.{' '}
                <span className="font-mono text-xs" style={{ color: 'var(--brand-accent)' }}>(Check server logs)</span>
              </p>

              <div className="flex gap-3 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
                    style={{ background: 'var(--surface-3)', border: `2px solid ${digit ? 'var(--brand-accent)' : 'var(--border-color)'}`, color: 'var(--text-primary)' }}
                  />
                ))}
              </div>

              <button onClick={onVerifyOtp} disabled={verifyOtp.isPending || otp.join('').length !== 6}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--brand-accent)' }}>
                {verifyOtp.isPending ? 'Verifying...' : 'Verify OTP'}
              </button>
            </>
          )}

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium" style={{ color: 'var(--brand-accent)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
