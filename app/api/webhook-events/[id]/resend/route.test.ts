import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireSessionOrApiKeyMock = vi.fn()
vi.mock('@/lib/request-auth', () => ({
  requireSessionOrApiKey: (...args: any[]) => requireSessionOrApiKeyMock(...args),
}))

const getSupabaseAdminMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}))

const getByIdMock = vi.fn()
vi.mock('@/lib/supabase-db', () => ({
  contactDb: { getById: (...args: any[]) => getByIdMock(...args) },
}))

const enviarWebhookLeadQualificadoMock = vi.fn()
vi.mock('@/lib/webhook-lead-qualificado', () => ({
  enviarWebhookLeadQualificado: (...args: any[]) => enviarWebhookLeadQualificadoMock(...args),
}))

import { POST } from './route'

function criarAdminFake(evento: any) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: evento, error: null })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  return { from: vi.fn(() => ({ select })) }
}

describe('POST /api/webhook-events/[id]/resend', () => {
  beforeEach(() => {
    requireSessionOrApiKeyMock.mockReset().mockResolvedValue(null)
    getSupabaseAdminMock.mockReset()
    getByIdMock.mockReset()
    enviarWebhookLeadQualificadoMock.mockReset()
  })

  it('retorna 404 quando o evento não existe', async () => {
    getSupabaseAdminMock.mockReturnValue(criarAdminFake(null))

    const res = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: 'evt-x' }),
    })

    expect(res.status).toBe(404)
  })

  it('retorna 404 quando o contato de origem não existe mais', async () => {
    getSupabaseAdminMock.mockReturnValue(criarAdminFake({ id: 'evt-1', contact_id: 'ct-1' }))
    getByIdMock.mockResolvedValue(undefined)

    const res = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: 'evt-1' }),
    })

    expect(res.status).toBe(404)
  })

  it('reenvia com sucesso e retorna success:true', async () => {
    getSupabaseAdminMock.mockReturnValue(criarAdminFake({ id: 'evt-1', contact_id: 'ct-1' }))
    getByIdMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', phone: '+5511999999999', tags: ['Qualificado'] })
    enviarWebhookLeadQualificadoMock.mockResolvedValue({ ok: true })

    const res = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: 'evt-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(enviarWebhookLeadQualificadoMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'ct-1' })
    )
  })

  it('reenvio que falha de novo retorna success:false com o erro', async () => {
    getSupabaseAdminMock.mockReturnValue(criarAdminFake({ id: 'evt-1', contact_id: 'ct-1' }))
    getByIdMock.mockResolvedValue({ id: 'ct-1', name: 'Maria', phone: '+5511999999999', tags: ['Qualificado'] })
    enviarWebhookLeadQualificadoMock.mockResolvedValue({ ok: false, erro: 'Timeout' })

    const res = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: 'evt-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ success: false, erro: 'Timeout' })
  })
})
