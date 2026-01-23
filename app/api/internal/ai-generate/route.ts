/**
 * Internal AI Generate Endpoint
 *
 * Este endpoint é chamado via context.call() pelo Upstash Workflow.
 * Tem maxDuration de 60s para permitir processamento de IA mais longo.
 *
 * NÃO deve ser chamado diretamente - use o workflow!
 */

import { type NextRequest, NextResponse } from 'next/server'
import { processChatAgent } from '@/lib/ai/agents/chat-agent'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'

// Permite até 60 segundos de execução (requer Vercel Pro)
export const maxDuration = 60

// Desabilita cache
export const dynamic = 'force-dynamic'

// =============================================================================
// Types
// =============================================================================

interface AIGenerateRequest {
  agent: AIAgent
  conversation: InboxConversation
  messages: InboxMessage[]
}

interface AIGenerateResponse {
  success: boolean
  message?: string
  sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated'
  shouldHandoff?: boolean
  handoffReason?: string
  handoffSummary?: string
  sources?: Array<{ title: string; content: string }>
  logId?: string
  error?: string
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse<AIGenerateResponse>> {
  const startTime = Date.now()

  console.log(`🔥 [AI-GENERATE] ========================================`)
  console.log(`🔥 [AI-GENERATE] ENDPOINT CALLED!`)
  console.log(`🔥 [AI-GENERATE] Timestamp: ${new Date().toISOString()}`)
  console.log(`🔥 [AI-GENERATE] ========================================`)

  try {
    // Valida API key interna (proteção básica)
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.SMARTZAP_API_KEY

    console.log(`🔑 [AI-GENERATE] Auth header present: ${!!authHeader}`)
    console.log(`🔑 [AI-GENERATE] Expected key exists: ${!!expectedKey}`)
    console.log(`🔑 [AI-GENERATE] Expected key length: ${expectedKey?.length || 0}`)

    if (!expectedKey) {
      console.error(`❌ [AI-GENERATE] SMARTZAP_API_KEY NOT CONFIGURED IN VERCEL!`)
      return NextResponse.json(
        { success: false, error: 'API key not configured on server' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${expectedKey}`) {
      console.error(`❌ [AI-GENERATE] UNAUTHORIZED - key mismatch!`)
      console.error(`❌ [AI-GENERATE] Received: ${authHeader?.substring(0, 20)}...`)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`✅ [AI-GENERATE] Auth validated!`)

    // Parse request body
    console.log(`📦 [AI-GENERATE] Parsing request body...`)
    const body = (await req.json()) as AIGenerateRequest
    const { agent, conversation, messages } = body

    console.log(`📦 [AI-GENERATE] Body parsed:`)
    console.log(`📦 [AI-GENERATE]   agent: ${agent?.name || 'null'}`)
    console.log(`📦 [AI-GENERATE]   conversation: ${conversation?.id || 'null'}`)
    console.log(`📦 [AI-GENERATE]   messages: ${messages?.length || 0}`)

    // Validação básica
    if (!agent || !conversation || !messages) {
      console.error(`❌ [AI-GENERATE] Missing required fields!`)
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agent, conversation, messages' },
        { status: 400 }
      )
    }

    console.log(`🤖 [AI-GENERATE] ========================================`)
    console.log(`🤖 [AI-GENERATE] CALLING processChatAgent...`)
    console.log(`🤖 [AI-GENERATE] Agent: ${agent.name}`)
    console.log(`🤖 [AI-GENERATE] Model: ${agent.model}`)
    console.log(`🤖 [AI-GENERATE] Conversation: ${conversation.id}`)
    console.log(`🤖 [AI-GENERATE] Phone: ${conversation.phone}`)
    console.log(`🤖 [AI-GENERATE] Messages count: ${messages.length}`)
    console.log(`🤖 [AI-GENERATE] Last message: "${messages[messages.length - 1]?.content?.substring(0, 50)}..."`)
    console.log(`🤖 [AI-GENERATE] ========================================`)

    // Processa com IA
    const result = await processChatAgent({
      agent,
      conversation,
      messages,
    })

    const elapsed = Date.now() - startTime

    console.log(`✅ [AI-GENERATE] ========================================`)
    console.log(`✅ [AI-GENERATE] processChatAgent RETURNED!`)
    console.log(`✅ [AI-GENERATE] Elapsed: ${elapsed}ms`)
    console.log(`✅ [AI-GENERATE] Success: ${result.success}`)
    console.log(`✅ [AI-GENERATE] Message: "${result.response?.message?.substring(0, 100)}..."`)
    console.log(`✅ [AI-GENERATE] Sentiment: ${result.response?.sentiment}`)
    console.log(`✅ [AI-GENERATE] Error: ${result.error || 'none'}`)
    console.log(`✅ [AI-GENERATE] LogId: ${result.logId}`)
    console.log(`✅ [AI-GENERATE] ========================================`)

    // Retorna resultado
    return NextResponse.json({
      success: result.success,
      message: result.response?.message,
      sentiment: result.response?.sentiment,
      shouldHandoff: result.response?.shouldHandoff,
      handoffReason: result.response?.handoffReason,
      handoffSummary: result.response?.handoffSummary,
      sources: result.response?.sources,
      logId: result.logId,
      error: result.error,
    })
  } catch (error) {
    const elapsed = Date.now() - startTime

    console.error(`💥 [AI-GENERATE] ========================================`)
    console.error(`💥 [AI-GENERATE] EXCEPTION CAUGHT!`)
    console.error(`💥 [AI-GENERATE] Elapsed: ${elapsed}ms`)
    console.error(`💥 [AI-GENERATE] Error type: ${error?.constructor?.name}`)
    console.error(`💥 [AI-GENERATE] Error message: ${error instanceof Error ? error.message : String(error)}`)
    console.error(`💥 [AI-GENERATE] Error stack: ${error instanceof Error ? error.stack : 'no stack'}`)
    console.error(`💥 [AI-GENERATE] ========================================`)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
