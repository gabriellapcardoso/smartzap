import { NextRequest, NextResponse } from 'next/server'
import { contactDb } from '@/lib/supabase-db'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { detectaTransicaoQualificado, enviarWebhookLeadQualificado } from '@/lib/webhook-lead-qualificado'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/contacts/[id]
 * Get a single contact
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { id } = await params
    const contact = await contactDb.getById(id)

    if (!contact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (error) {
    console.error('Failed to fetch contact:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar contato', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/contacts/[id]
 * Update a contact
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { id } = await params
    const body = await request.json()

    // Tags de antes precisam ser lidas ANTES do update pra detectar transição
    // real pra "Qualificado" — só dispara webhook quando o contato não tinha
    // a tag e passou a ter, não em toda edição.
    const contatoAntes = body.tags !== undefined ? await contactDb.getById(id) : undefined

    const contact = await contactDb.update(id, body)

    if (!contact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    if (contatoAntes && detectaTransicaoQualificado(contatoAntes.tags, contact.tags)) {
      const admin = getSupabaseAdmin()
      if (admin) {
        // Síncrono, 1 tentativa, timeout curto (5s) — não bloqueia a resposta
        // do PATCH por múltiplos segundos em caso de falha/timeout do destino;
        // falha é logada e reenviável pela UI, não retentada aqui.
        await enviarWebhookLeadQualificado(admin, contact)
      }
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Failed to update contact:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar contato', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/contacts/[id]
 * Delete a contact
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { id } = await params
    await contactDb.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete contact:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar contato', details: (error as Error).message },
      { status: 500 }
    )
  }
}
