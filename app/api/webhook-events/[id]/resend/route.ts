import { NextRequest, NextResponse } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { contactDb } from '@/lib/supabase-db'
import { enviarWebhookLeadQualificado } from '@/lib/webhook-lead-qualificado'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * POST /api/webhook-events/[id]/resend
 * Reenvia manualmente um evento de webhook que falhou — mesmo padrão da
 * Fase 11 (Gerador de Propostas) pro botão "Reenviar pro CRM".
 */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { id } = await params
  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 })
  }

  const { data: evento, error: erroEvento } = await admin
    .from('smartzap_webhook_events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (erroEvento || !evento) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  const contact = await contactDb.getById(evento.contact_id)
  if (!contact) {
    return NextResponse.json({ error: 'Contato de origem não encontrado' }, { status: 404 })
  }

  const resultado = await enviarWebhookLeadQualificado(admin, contact)

  return NextResponse.json({ success: resultado.ok, erro: resultado.erro })
}
