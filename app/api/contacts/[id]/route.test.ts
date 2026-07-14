import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireSessionOrApiKeyMock = vi.fn()
vi.mock('@/lib/request-auth', () => ({
  requireSessionOrApiKey: (...args: any[]) => requireSessionOrApiKeyMock(...args),
}))

const getByIdMock = vi.fn()
const updateMock = vi.fn()
vi.mock('@/lib/supabase-db', () => ({
  contactDb: {
    getById: (...args: any[]) => getByIdMock(...args),
    update: (...args: any[]) => updateMock(...args),
  },
}))

const getSupabaseAdminMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}))

const enviarWebhookLeadQualificadoMock = vi.fn()
vi.mock('@/lib/webhook-lead-qualificado', async () => {
  const actual = await vi.importActual<typeof import('@/lib/webhook-lead-qualificado')>(
    '@/lib/webhook-lead-qualificado'
  )
  return {
    ...actual,
    enviarWebhookLeadQualificado: (...args: any[]) => enviarWebhookLeadQualificadoMock(...args),
  }
})

import { PATCH } from './route'

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/contacts/ct-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/contacts/[id]', () => {
  beforeEach(() => {
    requireSessionOrApiKeyMock.mockReset().mockResolvedValue(null)
    getByIdMock.mockReset()
    updateMock.mockReset()
    getSupabaseAdminMock.mockReset().mockReturnValue('fake-admin-client')
    enviarWebhookLeadQualificadoMock.mockReset().mockResolvedValue({ ok: true })
  })

  it('REGRESSÃO: PATCH sem campo tags continua funcionando igual (não chama getById nem o webhook)', async () => {
    updateMock.mockResolvedValue({ id: 'ct-1', name: 'Novo Nome', tags: ['VIP'] })

    const res = await PATCH(patchRequest({ name: 'Novo Nome' }), { params: Promise.resolve({ id: 'ct-1' }) })

    expect(res.status).toBe(200)
    expect(getByIdMock).not.toHaveBeenCalled()
    expect(enviarWebhookLeadQualificadoMock).not.toHaveBeenCalled()
  })

  it('dispara o webhook quando a tag "Qualificado" é adicionada (transição real)', async () => {
    getByIdMock.mockResolvedValue({ id: 'ct-1', tags: ['VIP'] })
    updateMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', tags: ['VIP', 'Qualificado'] })

    const res = await PATCH(
      patchRequest({ tags: ['VIP', 'Qualificado'] }),
      { params: Promise.resolve({ id: 'ct-1' }) }
    )

    expect(res.status).toBe(200)
    expect(enviarWebhookLeadQualificadoMock).toHaveBeenCalledWith(
      'fake-admin-client',
      expect.objectContaining({ id: 'ct-1' })
    )
  })

  it('NÃO dispara o webhook quando o contato já tinha a tag "Qualificado" antes', async () => {
    getByIdMock.mockResolvedValue({ id: 'ct-1', tags: ['Qualificado'] })
    updateMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', tags: ['Qualificado', 'VIP'] })

    await PATCH(patchRequest({ tags: ['Qualificado', 'VIP'] }), { params: Promise.resolve({ id: 'ct-1' }) })

    expect(enviarWebhookLeadQualificadoMock).not.toHaveBeenCalled()
  })

  it('NÃO dispara o webhook quando a tag "Qualificado" é removida', async () => {
    getByIdMock.mockResolvedValue({ id: 'ct-1', tags: ['Qualificado'] })
    updateMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', tags: [] })

    await PATCH(patchRequest({ tags: [] }), { params: Promise.resolve({ id: 'ct-1' }) })

    expect(enviarWebhookLeadQualificadoMock).not.toHaveBeenCalled()
  })

  it('retorna 404 quando o contato não existe, sem chamar o webhook', async () => {
    getByIdMock.mockResolvedValue({ id: 'ct-1', tags: [] })
    updateMock.mockResolvedValue(undefined)

    const res = await PATCH(patchRequest({ tags: ['Qualificado'] }), { params: Promise.resolve({ id: 'ct-1' }) })

    expect(res.status).toBe(404)
    expect(enviarWebhookLeadQualificadoMock).not.toHaveBeenCalled()
  })

  it('falha do webhook não derruba a resposta do PATCH (sucesso continua 200)', async () => {
    getByIdMock.mockResolvedValue({ id: 'ct-1', tags: [] })
    updateMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', tags: ['Qualificado'] })
    enviarWebhookLeadQualificadoMock.mockResolvedValue({ ok: false, erro: 'Timeout' })

    const res = await PATCH(patchRequest({ tags: ['Qualificado'] }), { params: Promise.resolve({ id: 'ct-1' }) })

    expect(res.status).toBe(200)
  })

  it('retorna erro de autenticação quando requireSessionOrApiKey rejeita', async () => {
    const authResponse = new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    requireSessionOrApiKeyMock.mockResolvedValue(authResponse)

    const res = await PATCH(patchRequest({ name: 'X' }), { params: Promise.resolve({ id: 'ct-1' }) })

    expect(res.status).toBe(401)
    expect(updateMock).not.toHaveBeenCalled()
  })
})
