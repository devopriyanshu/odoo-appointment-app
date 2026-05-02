'use client'
import { useState } from 'react'
import { CreditCard, Smartphone, Building2, Lock } from 'lucide-react'

interface Props {
  amount: number
  serviceName: string
  onSuccess: (paymentRef: string) => void
}

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank']

export function PaymentScreen({ amount, serviceName, onSuccess }: Props) {
  const [tab, setTab] = useState<'card' | 'upi' | 'netbanking'>('card')
  const [processing, setProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [upiId, setUpiId] = useState('')
  const [bank, setBank] = useState('')

  const gst = Math.round(amount * 0.18)
  const total = amount + gst

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  const handlePay = () => {
    setProcessing(true)
    setTimeout(() => {
      const ref = `TXN${Date.now()}`
      setProcessing(false)
      onSuccess(ref)
    }, 1500)
  }

  const TABS = [
    { key: 'card' as const, label: 'Card', icon: <CreditCard size={14} /> },
    { key: 'upi' as const, label: 'UPI', icon: <Smartphone size={14} /> },
    { key: 'netbanking' as const, label: 'Net Banking', icon: <Building2 size={14} /> },
  ]

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const inputStyle = { background: 'var(--surface-3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
  const labelClass = "block text-xs font-semibold mb-1.5"
  const labelStyle = { color: 'var(--text-secondary)' }

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      {/* Order Summary */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-bold text-base" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          Order Summary
        </h3>
        <div className="space-y-2 pt-2">
          {[
            { label: serviceName, value: `₹${amount}` },
            { label: 'GST (18%)', value: `₹${gst}` },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total</span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{total}</span>
          </div>
        </div>
        <div className="rounded-lg p-3 text-center text-xs mt-2"
          style={{ background: 'rgba(108,99,255,0.08)', color: 'var(--text-muted)' }}>
          🔒 This is a demo payment. No real charges will be made.
        </div>
      </div>

      {/* Payment Form */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-bold text-base mb-4" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>
          Payment Method
        </h3>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--surface-3)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={tab === t.key ? { background: 'var(--brand-accent)', color: 'white' } : { color: 'var(--text-muted)' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Card tab */}
        {tab === 'card' && (
          <div className="space-y-3">
            <div>
              <label className={labelClass} style={labelStyle}>Name on Card</label>
              <input value={cardName} onChange={e => setCardName(e.target.value)}
                placeholder="Rahul Mehta" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Card Number</label>
              <input value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456" maxLength={19} className={inputClass} style={inputStyle} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass} style={labelStyle}>Expiry</label>
                <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY" maxLength={5} className={inputClass} style={inputStyle} />
              </div>
              <div className="w-24">
                <label className={labelClass} style={labelStyle}>CVV</label>
                <input type="password" value={cvv} onChange={e => setCvv(e.target.value.slice(0, 3))}
                  placeholder="•••" maxLength={3} className={inputClass} style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* UPI tab */}
        {tab === 'upi' && (
          <div className="space-y-3">
            <div>
              <label className={labelClass} style={labelStyle}>UPI ID</label>
              <input value={upiId} onChange={e => setUpiId(e.target.value)}
                placeholder="username@bank" className={inputClass} style={inputStyle} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Enter your UPI ID to pay ₹{total} directly from your bank account.
            </p>
          </div>
        )}

        {/* Net Banking tab */}
        {tab === 'netbanking' && (
          <div className="space-y-3">
            <div>
              <label className={labelClass} style={labelStyle}>Select Bank</label>
              <select value={bank} onChange={e => setBank(e.target.value)}
                className={inputClass} style={inputStyle}>
                <option value="">Choose your bank...</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={processing}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all mt-5 disabled:opacity-70"
          style={{ background: processing ? '#5a52e0' : 'var(--brand-accent)' }}
        >
          {processing
            ? <><span className="animate-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />Processing...</>
            : <><Lock size={14} />Pay ₹{total}</>
          }
        </button>

        <p className="text-center text-xs mt-2 flex items-center justify-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Lock size={10} /> 256-bit SSL encrypted
        </p>
      </div>
    </div>
  )
}
