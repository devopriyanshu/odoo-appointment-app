'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface Props {
  onVoice: (blob: Blob) => void
  disabled?: boolean
}

export function VoiceButton({ onVoice, disabled }: Props) {
  const { isRecording, startRecording, stopRecording, error } = useVoiceRecorder()

  const handleStart = async () => {
    if (disabled) return
    await startRecording()
  }

  const handleStop = async () => {
    const blob = await stopRecording()
    if (blob) onVoice(blob)
  }

  return (
    <div className="relative">
      {/* Pulsing ring while recording */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: 'loop' }}
            style={{ background: '#ff4d6d' }}
          />
        )}
      </AnimatePresence>

      <motion.button
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onTouchStart={handleStart}
        onTouchEnd={handleStop}
        whileTap={{ scale: 0.9 }}
        disabled={disabled}
        aria-label="Hold to speak"
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
        style={{
          background: isRecording ? '#ff4d6d' : 'var(--surface-3)',
          color: isRecording ? 'white' : 'var(--text-secondary)',
          border: `1px solid ${isRecording ? '#ff4d6d' : 'var(--border-color)'}`,
        }}
      >
        <Mic size={15} />
      </motion.button>
    </div>
  )
}
