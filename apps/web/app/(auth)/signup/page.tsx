'use client'
import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Calendar, Mail } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useSignup, useVerifyOtp } from '@/hooks/useAuth'

const signupSchema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars'),
  phone: z.string().optional().or(z.literal('').transform(() => undefined)),
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
  const [signupEmail, setSignupEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const fillOtp = (code: string) => {
    const digits = code.replace(/\D/g, '').slice(0, 6).split('')
    if (digits.length === 6) setOtp(digits)
  }

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'CUSTOMER' },
  })

  const onSignup = async (data: SignupData) => {
    const result = await signup.mutateAsync(data).catch(() => null)
    if (result?.otpToken) {
      setOtpToken(result.otpToken)
      setSignupEmail(data.email)
      setStep(2)
      setResendCooldown(30)
      if (result.devOtp) setDevOtp(result.devOtp)
      toast.success(result.message ?? 'Verification code sent to your email')
    }
  }

  const onInvalid = (errs: Record<string, { message?: string }>) => {
    const first = Object.entries(errs)[0]
    if (first) {
      const [field, err] = first
      const label = field === 'name' ? 'Name'
        : field === 'email' ? 'Email'
        : field === 'password' ? 'Password'
        : field === 'phone' ? 'Phone'
        : field === 'role' ? 'Role'
        : field
      toast.error(`${label}: ${err?.message ?? 'invalid'}`)
    } else {
      toast.error('Please fill all required fields')
    }
  }

  const onVerifyOtp = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Enter the 6-digit code')
      return
    }
    const result = await verifyOtp.mutateAsync({ otpToken, otp: otpString }).catch(() => null)
    if (result) router.push('/')
  }

  const onResendOtp = async () => {
    if (resendCooldown > 0 || !otpToken) return
    try {
      const res = await api.post('/auth/resend-otp', { otpToken })
      toast.success(res.data?.message ?? 'A new code was sent')
      setResendCooldown(30)
      if (res.data?.devOtp) setDevOtp(res.data.devOtp)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to resend code'
      toast.error(msg)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

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
            AppointEase
          </span>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
          {step === 1 ? (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
                Create your account
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Join AppointEase today</p>

              <form onSubmit={handleSubmit(onSignup, onInvalid)} className="space-y-4">
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
                    <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="e.g. Test@1234"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Live requirements — turn green as each rule passes */}
                  {(() => {
                    const pw = watch('password') ?? ''
                    const rules: [string, boolean][] = [
                      ['8+ characters', pw.length >= 8],
                    ]
                    return (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {rules.map(([label, ok]) => (
                          <span key={label} className="text-[11px] inline-flex items-center gap-1"
                            style={{ color: ok ? '#047857' : 'var(--text-muted)' }}>
                            <span style={{
                              width: 4, height: 4, borderRadius: 999,
                              background: ok ? '#10b981' : 'var(--text-muted)',
                              display: 'inline-block',
                            }} />
                            {label}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
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
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                We&apos;ve sent a 6-digit code to
              </p>
              <p className="text-sm font-medium mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Mail size={14} style={{ color: 'var(--brand-accent)' }} /> {signupEmail || 'your email'}
              </p>

              {devOtp && (
                <div
                  className="mb-4 p-3 rounded-xl flex items-center justify-between gap-3"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed #f59e0b' }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#b45309' }}>
                      Dev mode
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Code: <span className="font-mono font-bold text-base" style={{ color: 'var(--text-primary)' }}>{devOtp}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fillOtp(devOtp)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
                    style={{ background: '#f59e0b' }}
                  >
                    Auto-fill
                  </button>
                </div>
              )}

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

              <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                Didn&apos;t get the code?{' '}
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={resendCooldown > 0}
                  className="font-medium disabled:opacity-50"
                  style={{ color: 'var(--brand-accent)' }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                </button>
              </p>
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
