'use client'
import { format } from 'date-fns'
import type { ChatMessage as ChatMessageType } from '@/types'

interface Props {
  message: ChatMessageType
}

export function ChatMessage({ message }: Props) {
  const isAI = message.role === 'assistant'

  return (
    <div className={`flex gap-2 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
          style={{ background: 'var(--brand-accent)' }}>
          AI
        </div>
      )}
      <div className="max-w-[78%] flex flex-col">
        <div
          className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${isAI ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
          style={{
            background: isAI ? 'var(--surface-3)' : 'var(--brand-accent)',
            color: isAI ? 'var(--text-primary)' : 'white',
          }}
        >
          {/* Render bold text */}
          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={i}>{part.slice(2, -2)}</strong>
              : <span key={i}>{part}</span>
          )}
        </div>
        {message.timestamp && (
          <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(message.timestamp), 'h:mm a')}
          </span>
        )}
      </div>
    </div>
  )
}
