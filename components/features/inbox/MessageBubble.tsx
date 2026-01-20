'use client'

/**
 * MessageBubble - Editorial Minimal Design
 *
 * Design Philosophy:
 * - Clean, almost monochromatic palette
 * - No redundant avatars/names (grouped messages handle this)
 * - Subtle color differentiation
 * - Tight spacing within message groups
 * - Typography-focused with refined details
 */

import React, { memo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, CheckCheck, Clock, AlertCircle, Sparkles, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { InboxMessage, DeliveryStatus, Sentiment } from '@/types'

export interface MessageBubbleProps {
  message: InboxMessage
  /** Name of the AI agent for displaying in AI responses */
  agentName?: string
  /** Whether this is the first message in a group from same sender */
  isFirstInGroup?: boolean
  /** Whether this is the last message in a group from same sender */
  isLastInGroup?: boolean
}

// Delivery status - minimal, icon-only
function DeliveryStatusIcon({ status }: { status: DeliveryStatus }) {
  const base = 'h-3 w-3 opacity-50'
  switch (status) {
    case 'pending':
      return <Clock className={cn(base, 'text-zinc-400')} />
    case 'sent':
      return <Check className={cn(base, 'text-zinc-400')} />
    case 'delivered':
      return <CheckCheck className={cn(base, 'text-zinc-400')} />
    case 'read':
      return <CheckCheck className={cn(base, 'text-emerald-400 opacity-100')} />
    case 'failed':
      return <AlertCircle className={cn(base, 'text-rose-400 opacity-100')} />
    default:
      return null
  }
}

// Sentiment - ultra minimal dot indicator
function SentimentIndicator({ sentiment }: { sentiment: Sentiment }) {
  const colors: Record<Sentiment, string> = {
    positive: 'bg-emerald-400',
    neutral: 'bg-zinc-400',
    negative: 'bg-amber-400',
    frustrated: 'bg-rose-400',
  }
  const labels: Record<Sentiment, string> = {
    positive: 'Positivo',
    neutral: 'Neutro',
    negative: 'Negativo',
    frustrated: 'Frustrado',
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('w-1.5 h-1.5 rounded-full', colors[sentiment])} />
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {labels[sentiment]}
      </TooltipContent>
    </Tooltip>
  )
}

// Check if message is a handoff/system message
function isHandoffMessage(content: string): boolean {
  return content.includes('**Transferência') || content.includes('**Motivo:**')
}

// Parse handoff message into structured data
function parseHandoffMessage(content: string): { title: string; reason: string; summary: string } | null {
  if (!isHandoffMessage(content)) return null

  const reasonMatch = content.match(/\*\*Motivo:\*\*\s*(.+?)(?=\n|$)/s)
  const summaryMatch = content.match(/\*\*Resumo:\*\*\s*(.+?)(?=\n|$)/s)

  return {
    title: 'Transferência para atendente',
    reason: reasonMatch?.[1]?.trim() || '',
    summary: summaryMatch?.[1]?.trim() || '',
  }
}

export const MessageBubble = memo(function MessageBubble({
  message,
  agentName,
  isFirstInGroup = true,
  isLastInGroup = true,
}: MessageBubbleProps) {
  const {
    direction,
    content,
    delivery_status,
    created_at,
    ai_sentiment,
    ai_sources,
  } = message

  const isInbound = direction === 'inbound'
  const isAIResponse = !isInbound && (message.ai_response_id || ai_sources)
  const handoffData = parseHandoffMessage(content)

  // Format time
  const time = created_at
    ? format(new Date(created_at), 'HH:mm', { locale: ptBR })
    : ''

  // Special rendering for handoff messages
  if (handoffData) {
    return (
      <div className="flex justify-center my-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="max-w-md px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{handoffData.title}</span>
          </div>
          {handoffData.reason && (
            <p className="text-xs text-zinc-400 mb-1">
              <span className="text-zinc-500">Motivo:</span> {handoffData.reason}
            </p>
          )}
          {handoffData.summary && (
            <p className="text-xs text-zinc-400">
              <span className="text-zinc-500">Resumo:</span> {handoffData.summary}
            </p>
          )}
          <span className="text-[10px] text-zinc-500 mt-2 block">{time}</span>
        </div>
      </div>
    )
  }

  // Calculate border radius based on position in group
  const getBorderRadius = () => {
    if (isInbound) {
      // Left side messages
      if (isFirstInGroup && isLastInGroup) return 'rounded-2xl rounded-bl-md'
      if (isFirstInGroup) return 'rounded-2xl rounded-bl-lg'
      if (isLastInGroup) return 'rounded-2xl rounded-tl-lg rounded-bl-md'
      return 'rounded-2xl rounded-l-lg'
    } else {
      // Right side messages
      if (isFirstInGroup && isLastInGroup) return 'rounded-2xl rounded-br-md'
      if (isFirstInGroup) return 'rounded-2xl rounded-br-lg'
      if (isLastInGroup) return 'rounded-2xl rounded-tr-lg rounded-br-md'
      return 'rounded-2xl rounded-r-lg'
    }
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        'animate-in fade-in slide-in-from-bottom-1 duration-150',
        isInbound ? 'self-start' : 'self-end flex-row-reverse',
        // Tighter spacing for grouped messages
        !isLastInGroup && 'mb-0.5',
        isLastInGroup && 'mb-2'
      )}
    >
      <div className={cn(
        'flex flex-col max-w-[70%]',
        isInbound ? 'items-start' : 'items-end'
      )}>
        {/* Bubble */}
        <div
          className={cn(
            'relative px-3.5 py-2',
            getBorderRadius(),
            // Inbound: subtle gray
            isInbound && 'bg-zinc-800/60 text-zinc-100',
            // Outbound from human: refined emerald (not saturated)
            !isInbound && !isAIResponse && 'bg-emerald-600/90 text-white',
            // AI Response: slightly different to distinguish
            isAIResponse && 'bg-zinc-700/80 text-zinc-100 ring-1 ring-zinc-600/50'
          )}
        >
          {/* AI indicator removed - header already shows agent info */}

          {/* Message content */}
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>

          {/* AI Sources - ultra minimal */}
          {isAIResponse && ai_sources && ai_sources.length > 0 && isLastInGroup && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400/60 hover:text-emerald-400/90 transition-colors">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>{ai_sources.length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium mb-1 text-xs">Fontes:</p>
                <ul className="text-xs space-y-0.5 text-zinc-400">
                  {ai_sources.map((source, i) => (
                    <li key={i} className="truncate">• {source.title}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Footer - only on last message of group */}
        {isLastInGroup && (
          <div className={cn(
            'flex items-center gap-1.5 mt-1 px-1',
            isInbound ? 'flex-row' : 'flex-row-reverse'
          )}>
            {/* Sentiment indicator */}
            {isInbound && ai_sentiment && (
              <SentimentIndicator sentiment={ai_sentiment as Sentiment} />
            )}

            <span className="text-[10px] text-zinc-500">{time}</span>

            {/* Delivery status */}
            {!isInbound && delivery_status && (
              <DeliveryStatusIcon status={delivery_status} />
            )}
          </div>
        )}
      </div>
    </div>
  )
})
