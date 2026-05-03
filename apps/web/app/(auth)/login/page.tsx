'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Calendar } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const login = useLogin()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const result = await login.mutateAsync(data).catch(() => null)
    if (result) router.push('/')
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
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
            Welcome back
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              {errors.email && <p className="text-xs mt-1 text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
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

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--brand-accent)' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-accent)' }}
            >
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium" style={{ color: 'var(--brand-accent)' }}>Create one</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-3 rounded-xl text-xs" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Demo accounts:</p>
            <p>Customer: customer@demo.com / Customer@1234</p>
            <p>Organiser: dr.sharma@demo.com / Doctor@1234</p>
            <p>Admin: admin@demo.com / Admin@1234</p>
          </div>
        </div>
      </div>
    </div>
  )
}
