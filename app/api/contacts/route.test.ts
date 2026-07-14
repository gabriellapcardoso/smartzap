import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireSessionOrApiKeyMock = vi.fn()
vi.mock('@/lib/request-auth', () => ({
  requireSessionOrApiKey: (...args: any[]) => requireSessionOrApiKeyMock(...args),
}))

const getByPhoneMock = vi.fn()
const addMock = vi.fn()
vi.mock('@/lib/supabase-db', () => ({
  contactDb: {
    getByPhone: (...args: any[]) => getByPhoneMock(...args),
    add: (...args: any[]) => addMock(...args),
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

import { POST } from './route'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/contacts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/contacts', () => {
  beforeEach(() => {
    requireSessionOrApiKeyMock.mockReset().mockResolvedValue(null)
    getByPhoneMock.mockReset()
    addMock.mockReset()
    getSupabaseAdminMock.mockReset().mockReturnValue('fake-admin-client')
    enviarWebhookLeadQualificadoMock.mockReset().mockResolvedValue({ ok: true })
  })

  it('REGRESSÃO: criar contato sem a tag "Qualificado" continua funcionando igual (não chama o webhook)', async () => {
    getByPhoneMock.mockResolvedValue(undefined)
    addMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', phone: '+5511999999999', tags: ['VIP'] })

    const res = await POST(postRequest({ name: 'Maria', phone: '+5511999999999', tags: ['VIP'] }))

    expect(res.status).toBe(201)
    expect(enviarWebhookLeadQualificadoMock).not.toHaveBeenCalled()
  })

  it('dispara o webhook ao criar um contato novo já com a tag "Qualificado" (bug original: nunca disparava)', async () => {
    getByPhoneMock.mockResolvedValue(undefined)
    addMock.mockResolvedValue({
      id: 'ct-2',
      name: 'João',
      phone: '+5511988888888',
      tags: ['Qualificado'],
    })

    const res = await POST(
      postRequest({ name: 'João', phone: '+5511988888888', tags: ['Qualificado'] })
    )

    expect(res.status).toBe(201)
    expect(enviarWebhookLeadQualificadoMock).toHaveBeenCalledWith(
      'fake-admin-client',
      expect.objectContaining({ id: 'ct-2' })
    )
  })

  it('dispara o webhook quando o telefone já existia sem a tag e o "create" na prática atualiza pra "Qualificado"', async () => {
    getByPhoneMock.mockResolvedValue({ id: 'ct-3', phone: '+5511977777777', tags: ['VIP'] })
    addMock.mockResolvedValue({
      id: 'ct-3',
      name: 'Ana',
      phone: '+5511977777777',
      tags: ['VIP', 'Qualificado'],
    })

    await POST(postRequest({ name: 'Ana', phone: '+5511977777777', tags: ['VIP', 'Qualificado'] }))

    expect(enviarWebhookLeadQualificadoMock).toHaveBeenCalledWith(
      'fake-admin-client',
      expect.objectContaining({ id: 'ct-3' })
    )
  })

  it('NÃO dispara o webhook quando o contato (por telefone) já tinha a tag "Qualificado" antes', async () => {
    getByPhoneMock.mockResolvedValue({ id: 'ct-4', phone: '+5511966666666', tags: ['Qualificado'] })
    addMock.mockResolvedValue({
      id: 'ct-4',
      name: 'Carlos',
      phone: '+5511966666666',
      tags: ['Qualificado', 'VIP'],
    })

    await POST(postRequest({ name: 'Carlos', phone: '+5511966666666', tags: ['Qualificado', 'VIP'] }))

    expect(enviarWebhookLeadQualificadoMock).not.toHaveBeenCalled()
  })

  it('falha do webhook não derruba a resposta do POST (sucesso continua 201)', async () => {
    getByPhoneMock.mockResolvedValue(undefined)
    addMock.mockResolvedValue({ id: 'ct-5', name: 'Bia', phone: '+5511955555555', tags: ['Qualificado'] })
    enviarWebhookLeadQualificadoMock.mockResolvedValue({ ok: false, erro: 'Timeout' })

    const res = await POST(postRequest({ name: 'Bia', phone: '+5511955555555', tags: ['Qualificado'] }))

    expect(res.status).toBe(201)
  })

  it('retorna erro de autenticação quando requireSessionOrApiKey rejeita', async () => {
    const authResponse = new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    requireSessionOrApiKeyMock.mockResolvedValue(authResponse)

    const res = await POST(postRequest({ name: 'X', phone: '+5511944444444' }))

    expect(res.status).toBe(401)
    expect(addMock).not.toHaveBeenCalled()
  })
})
