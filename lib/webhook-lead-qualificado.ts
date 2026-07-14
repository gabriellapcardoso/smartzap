import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contact } from '@/types'

const TAG_QUALIFICADO = 'qualificado'
const TIMEOUT_MS = 5000

// Comparação de tag só nesta função (detecção de transição) — a tag continua
// sendo gravada/exibida como o usuário digitou em qualquer outro lugar do
// produto. `.trim()` sozinho (o que já existia) trata "Qualificado" e
// "qualificado" como tags diferentes, quebrando a detecção de transição.
function normalizarParaComparacao(tag: string): string {
    return tag.trim().toLowerCase()
}

export function detectaTransicaoQualificado(
    tagsAntes: string[] | null | undefined,
    tagsDepois: string[] | null | undefined
): boolean {
    const antesTinhaTag = (tagsAntes || []).some((t) => normalizarParaComparacao(t) === TAG_QUALIFICADO)
    const depoisTemTag = (tagsDepois || []).some((t) => normalizarParaComparacao(t) === TAG_QUALIFICADO)
    return !antesTinhaTag && depoisTemTag
}

export interface EnviarWebhookLeadResultado {
    ok: boolean
    erro?: string
}

export async function enviarWebhookLeadQualificado(
    supabase: SupabaseClient,
    contact: Pick<Contact, 'id' | 'name' | 'phone' | 'email' | 'tags'>
): Promise<EnviarWebhookLeadResultado> {
    const url = process.env.GERADOR_PROPOSTAS_WEBHOOK_URL
    const secret = process.env.SMARTZAP_WEBHOOK_SECRET
    const eventId = `${contact.id}-qualificado`

    const payload = {
        event: 'contact.qualified',
        event_id: eventId,
        occurred_at: new Date().toISOString(),
        source: 'smartzap',
        contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email || undefined,
            tags: contact.tags,
        },
        trigger: { route: 'contacts.patch', mode: 'individual' },
    }

    let responseStatus: number | null = null
    let ok = false
    let erro: string | undefined
    let clienteId: string | undefined

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
        const res = await fetch(url ?? '', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': secret ?? '',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        responseStatus = res.status
        const data = await res.json().catch(() => null)

        if (res.ok) {
            ok = true
            clienteId = data?.cliente_id ?? undefined
        } else {
            erro = data?.error || `Erro HTTP ${res.status}`
        }
    } catch (e: any) {
        erro = e?.name === 'AbortError' ? 'Timeout ao chamar Gerador de Propostas' : e?.message || 'Erro desconhecido'
    }

    const { data: existente } = await supabase
        .from('smartzap_webhook_events')
        .select('id, attempt_count')
        .eq('contact_id', contact.id)
        .eq('event_id', eventId)
        .maybeSingle()

    const row = {
        contact_id: contact.id,
        event_id: eventId,
        status: ok ? 'enviado' : 'falhou',
        attempt_count: (existente?.attempt_count ?? 0) + 1,
        response_status: responseStatus,
        erro: erro ?? null,
        cliente_id: clienteId ?? null,
        last_attempt_at: new Date().toISOString(),
    }

    const { error: erroGravacao } = await supabase
        .from('smartzap_webhook_events')
        .upsert(row, { onConflict: 'contact_id,event_id' })

    if (erroGravacao) {
        console.error('Falha ao gravar smartzap_webhook_events:', erroGravacao.message)
    }

    return { ok, erro }
}
