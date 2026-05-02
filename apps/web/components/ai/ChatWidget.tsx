'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

export function ChatWidget() {
  const { chatOpen, toggleChat } = useUIStore()

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white md:bottom-6"
        style={{
          background: 'var(--brand-accent)',
          bottom: chatOpen ? undefined : undefined,
        }}
      >
        {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              height: 500,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'var(--brand-accent)' }}
                >
                  AI
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Booking Assistant
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Powered by Sarvam AI
                  </p>
                </div>
              </div>
              <button
                onClick={toggleChat}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-3)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {/* Welcome message */}
              <div className="flex gap-2">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: 'var(--brand-accent)' }}
                >
                  AI
                </div>
                <div
                  className="px-3 py-2 rounded-xl rounded-tl-sm max-w-[280px] text-sm"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}
                >
                  Hi! 👋 I can help you book appointments. Try saying &quot;Book a dental checkup for
                  tomorrow&quot; or tap the mic to speak.
                </div>
              </div>
              <p className="text-center text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
                Full AI integration coming in Phase 4
              </p>
            </div>

            {/* Input */}
            <div
              className="p-3 border-t flex items-center gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <input
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface-3)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                disabled
              />
              <button
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white opacity-50"
                style={{ background: 'var(--brand-accent)' }}
                disabled
              >
                <MessageCircle size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
