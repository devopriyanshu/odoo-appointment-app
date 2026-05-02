'use client'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#0a0a1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6 max-w-md"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.25)' }}>
            <AlertTriangle size={36} style={{ color: '#ff4d6d' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f0f0ff', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666699', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            An unexpected error occurred. Our team has been notified. Please try again or return to the home page.
          </p>
          {error.digest && (
            <p style={{ color: '#444466', fontSize: '0.75rem', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={reset}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', background: '#6c63ff', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <RefreshCw size={14} />
              Try Again
            </button>
            <a href="/"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', background: '#1a1a35', color: '#9999cc', border: '1px solid #2e2e55', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
              <Home size={14} />
              Go Home
            </a>
          </div>
        </motion.div>
      </body>
    </html>
  )
}
