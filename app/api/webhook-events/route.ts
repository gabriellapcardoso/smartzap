import { NextRequest, NextResponse } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/webhook-events
 * Lista eventos de webhook de lead qualificado, mais recentes primeiro.
 * UI mínima de reenvio (Fase 7+8) — fecha o gap de "log sem recuperação"
 * apontado na revisão de engenharia.
 */
export async function GET(request: Request) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('smartzap_webhook_events')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data ?? [] })
}
