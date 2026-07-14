import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { contactDb } from '@/lib/supabase-db'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { validateBodyOrError } from '@/lib/api-validation'

const TAG_QUALIFICADO = 'qualificado'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BulkUpdateTagsSchema = z.object({
  ids: z.array(z.string().min(1, 'ID inválido')).min(1, 'Selecione pelo menos um contato').max(500, 'Máximo de 500 contatos por operação'),
  tagsToAdd: z.array(z.string().min(1, 'Tag não pode ser vazia')).optional().default([]),
  tagsToRemove: z.array(z.string().min(1, 'Tag não pode ser vazia')).optional().default([]),
})

/**
 * POST /api/contacts/bulk-tags
 * Adiciona e/ou remove tags em massa em múltiplos contatos.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request)
    if (auth) return auth

    const body = await request.json().catch(() => ({}))

    const validation = validateBodyOrError(BulkUpdateTagsSchema, body)
    if (!validation.success) return validation.response

    const { ids, tagsToAdd, tagsToRemove } = validation.data

    // Retorno rápido: nada a fazer
    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    // Sinalização (Fase 7+8, PR1): qualificação em lote ainda não sincroniza
    // com o Gerador de Propostas — só a rota individual dispara o webhook por
    // enquanto (PR2 vai endereçar bulk). Sem isso, a fundadora pode achar que
    // marcar "Qualificado" em massa também sincroniza, e não sincroniza.
    const adicionaQualificado = tagsToAdd.some((t) => t.trim().toLowerCase() === TAG_QUALIFICADO)
    let qualificadosSemSync = 0
    if (adicionaQualificado) {
      const tagsAntes = await contactDb.getTagsByIds(ids)
      qualificadosSemSync = ids.filter((id) => {
        const antes = tagsAntes[id] || []
        return !antes.some((t) => t.trim().toLowerCase() === TAG_QUALIFICADO)
      }).length
    }

    const updated = await contactDb.bulkUpdateTags(ids, tagsToAdd, tagsToRemove)

    const warning =
      qualificadosSemSync > 0
        ? `${qualificadosSemSync} contato(s) marcado(s) como Qualificado em lote ainda não sincronizam automaticamente com o Gerador de Propostas — só a qualificação individual sincroniza por enquanto.`
        : undefined

    return NextResponse.json({ updated, ...(warning ? { warning } : {}) })
  } catch (error) {
    console.error('Failed to bulk update tags:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar tags em massa', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
