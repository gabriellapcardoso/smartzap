import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireSessionOrApiKeyMock = vi.fn()
vi.mock('@/lib/request-auth', () => ({
  requireSessionOrApiKey: (...args: any[]) => requireSessionOrApiKeyMock(...args),
}))

const getSupabaseAdminMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}))

import { GET } from './route'

function criarAdminFake(data: any[], error: any = null) {
  const order = vi.fn(() => ({
    limit: vi.fn().mockResolvedValue({ data, error }),
  }))
  const select = vi.fn(() => ({ order }))
  return { from: vi.fn(() => ({ select })) }
}

describe('GET /api/webhook-events', () => {
  beforeEach(() => {
    requireSessionOrApiKeyMock.mockReset().mockResolvedValue(null)
    getSupabaseAdminMock.mockReset()
  })

  it('retorna 401 quando não autenticado', async () => {
    requireSessionOrApiKeyMock.mockResolvedValue(new Response(null, { status: 401 }))
    const res = await GET(new Request('http://localhost/api/webhook-events'))
    expect(res.status).toBe(401)
  })

  it('retorna a lista de eventos ordenada por criado_em desc', async () => {
    const eventos = [{ id: 'evt-1', status: 'falhou' }]
    getSupabaseAdminMock.mockReturnValue(criarAdminFake(eventos))

    const res = await GET(new Request('http://localhost/api/webhook-events'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.events).toEqual(eventos)
  })

  it('retorna 500 quando a query falha', async () => {
    getSupabaseAdminMock.mockReturnValue(criarAdminFake(null, { message: 'erro de banco' }))

    const res = await GET(new Request('http://localhost/api/webhook-events'))
    expect(res.status).toBe(500)
  })
})
