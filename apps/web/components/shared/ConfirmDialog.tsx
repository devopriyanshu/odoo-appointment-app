'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  dangerous?: boolean
  loading?: boolean
  children?: React.ReactNode
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  dangerous = false, loading = false, children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--text-primary)' }}>{title}</DialogTitle>
          <DialogDescription style={{ color: 'var(--text-muted)' }}>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-3)]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 ${dangerous ? 'bg-red-500' : ''}`}
            style={!dangerous ? { background: 'var(--brand-accent)' } : {}}>
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
