import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectaTransicaoQualificado, enviarWebhookLeadQualificado } from './webhook-lead-qualificado'

describe('detectaTransicaoQualificado', () => {
    it('detecta transição quando a tag é adicionada agora', () => {
        expect(detectaTransicaoQualificado([], ['Qualificado'])).toBe(true)
    })

    it('não detecta transição quando o contato já tinha a tag antes', () => {
        expect(detectaTransicaoQualificado(['Qualificado'], ['Qualificado', 'VIP'])).toBe(false)
    })

    it('detecta transição mesmo com capitalização diferente ("qualificado")', () => {
        expect(detectaTransicaoQualificado([], ['qualificado'])).toBe(true)
    })

    it('não detecta transição quando a tag é removida', () => {
        expect(detectaTransicaoQualificado(['Qualificado'], [])).toBe(false)
    })

    it('não detecta transição quando nem antes nem depois tem a tag', () => {
        expect(detectaTransicaoQualificado(['VIP'], ['VIP', 'Novo'])).toBe(false)
    })

    it('lida com tagsAntes/tagsDepois undefined ou null', () => {
        expect(detectaTransicaoQualificado(null, ['Qualificado'])).toBe(true)
        expect(detectaTransicaoQualificado(undefined, undefined)).toBe(false)
    })
})

const contact = {
    id: 'ct-abc',
    name: 'Maria Silva',
    phone: '+5511999999999',
    email: 'maria@exemplo.com',
    tags: ['Qualificado'],
}

function criarSupabaseFake(existente: { id: string; attempt_count: number } | null) {
    const chamadas: { metodo: string; args: any[] }[] = []

    const maybeSingle = vi.fn().mockResolvedValue({ data: existente, error: null })
    const eqSegundo = vi.fn(() => ({ maybeSingle }))
    const eqPrimeiro = vi.fn(() => ({ eq: eqSegundo }))
    const select = vi.fn(() => ({ eq: eqPrimeiro }))

    const upsert = vi.fn((row: any) => {
        chamadas.push({ metodo: 'upsert', args: [row] })
        return Promise.resolve({ data: null, error: null })
    })

    const from = vi.fn(() => ({ select, upsert }))

    return { from, chamadas }
}

describe('enviarWebhookLeadQualificado', () => {
    const originalFetch = global.fetch
    const originalUrl = process.env.GERADOR_PROPOSTAS_WEBHOOK_URL
    const originalSecret = process.env.SMARTZAP_WEBHOOK_SECRET

    beforeEach(() => {
        process.env.GERADOR_PROPOSTAS_WEBHOOK_URL = 'https://propostas.test/api/webhooks/novo-lead'
        process.env.SMARTZAP_WEBHOOK_SECRET = 'segredo-teste'
    })

    afterEach(() => {
        global.fetch = originalFetch
        process.env.GERADOR_PROPOSTAS_WEBHOOK_URL = originalUrl
        process.env.SMARTZAP_WEBHOOK_SECRET = originalSecret
        vi.restoreAllMocks()
    })

    it('envia com sucesso e grava o evento como enviado', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true, cliente_id: 'cli-1', criado: true }),
        }) as any

        const supabaseFake = criarSupabaseFake(null)
        const resultado = await enviarWebhookLeadQualificado(supabaseFake as any, contact)

        expect(resultado.ok).toBe(true)
        const upsertCall = supabaseFake.chamadas.find((c) => c.metodo === 'upsert')
        expect(upsertCall?.args[0]).toMatchObject({
            contact_id: 'ct-abc',
            event_id: 'ct-abc-qualificado',
            status: 'enviado',
            attempt_count: 1,
            cliente_id: 'cli-1',
        })
    })

    it('grava o evento como falhou quando o destino responde com erro, sem lançar exceção', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ error: 'Secret inválido' }),
        }) as any

        const supabaseFake = criarSupabaseFake(null)
        const resultado = await enviarWebhookLeadQualificado(supabaseFake as any, contact)

        expect(resultado.ok).toBe(false)
        expect(resultado.erro).toContain('Secret inválido')
        const upsertCall = supabaseFake.chamadas.find((c) => c.metodo === 'upsert')
        expect(upsertCall?.args[0]).toMatchObject({ status: 'falhou', response_status: 401 })
    })

    it('grava o evento como falhou em timeout, sem lançar exceção (não pode travar o PATCH)', async () => {
        global.fetch = vi.fn().mockImplementation(() => {
            const err = new Error('aborted')
            err.name = 'AbortError'
            return Promise.reject(err)
        }) as any

        const supabaseFake = criarSupabaseFake(null)
        const resultado = await enviarWebhookLeadQualificado(supabaseFake as any, contact)

        expect(resultado.ok).toBe(false)
        expect(resultado.erro).toContain('Timeout')
    })

    it('incrementa attempt_count via upsert quando já existe uma tentativa (mesmo event_id)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        }) as any

        const supabaseFake = criarSupabaseFake({ id: 'evt-1', attempt_count: 1 })
        await enviarWebhookLeadQualificado(supabaseFake as any, contact)

        const upsertCall = supabaseFake.chamadas.find((c) => c.metodo === 'upsert')
        expect(upsertCall?.args[0]).toMatchObject({ attempt_count: 2, status: 'enviado' })
    })

    it('não derruba a função quando a gravação em smartzap_webhook_events falha', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        }) as any

        const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        const eqSegundo = vi.fn(() => ({ maybeSingle }))
        const eqPrimeiro = vi.fn(() => ({ eq: eqSegundo }))
        const select = vi.fn(() => ({ eq: eqPrimeiro }))
        const upsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'constraint violada' } })
        const supabaseFake = { from: vi.fn(() => ({ select, upsert })) }

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const resultado = await enviarWebhookLeadQualificado(supabaseFake as any, contact)

        expect(resultado.ok).toBe(true)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Falha ao gravar smartzap_webhook_events:',
            'constraint violada'
        )
        consoleErrorSpy.mockRestore()
    })

    it('event_id é {contact.id}-qualificado — mesmo contato reenviado não gera evento duplicado', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        })
        global.fetch = fetchMock as any

        const supabaseFake = criarSupabaseFake(null)
        await enviarWebhookLeadQualificado(supabaseFake as any, contact)

        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body.event_id).toBe('ct-abc-qualificado')
        expect(body.contact.phone).toBe('+5511999999999')
    })
})
