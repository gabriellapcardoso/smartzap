import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireSessionOrApiKeyMock = vi.fn()
vi.mock('@/lib/request-auth', () => ({
  requireSessionOrApiKey: (...args: any[]) => requireSessionOrApiKeyMock(...args),
}))

const getTagsByIdsMock = vi.fn()
const bulkUpdateTagsMock = vi.fn()
vi.mock('@/lib/supabase-db', () => ({
  contactDb: {
    getTagsByIds: (...args: any[]) => getTagsByIdsMock(...args),
    bulkUpdateTags: (...args: any[]) => bulkUpdateTagsMock(...args),
  },
}))

import { POST } from './route'

function request(body: unknown) {
  return new Request('http://localhost/api/contacts/bulk-tags', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/contacts/bulk-tags', () => {
  beforeEach(() => {
    requireSessionOrApiKeyMock.mockReset().mockResolvedValue(null)
    getTagsByIdsMock.mockReset()
    bulkUpdateTagsMock.mockReset().mockResolvedValue(2)
  })

  it('não inclui warning quando a tag adicionada não é Qualificado', async () => {
    const res = await POST(request({ ids: ['ct-1', 'ct-2'], tagsToAdd: ['VIP'], tagsToRemove: [] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.warning).toBeUndefined()
    expect(getTagsByIdsMock).not.toHaveBeenCalled()
  })

  it('inclui warning contando quantos contatos NÃO tinham a tag Qualificado antes', async () => {
    getTagsByIdsMock.mockResolvedValue({ 'ct-1': ['VIP'], 'ct-2': ['Qualificado'] })

    const res = await POST(request({ ids: ['ct-1', 'ct-2'], tagsToAdd: ['Qualificado'], tagsToRemove: [] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.warning).toContain('1 contato(s)')
  })

  it('detecta "Qualificado" em qualquer capitalização (case-insensitive)', async () => {
    getTagsByIdsMock.mockResolvedValue({ 'ct-1': [] })

    const res = await POST(request({ ids: ['ct-1'], tagsToAdd: ['qualificado'], tagsToRemove: [] }))
    const body = await res.json()

    expect(body.warning).toContain('1 contato(s)')
  })

  it('não inclui warning quando todos os contatos já tinham a tag antes', async () => {
    getTagsByIdsMock.mockResolvedValue({ 'ct-1': ['Qualificado'] })

    const res = await POST(request({ ids: ['ct-1'], tagsToAdd: ['Qualificado'], tagsToRemove: [] }))
    const body = await res.json()

    expect(body.warning).toBeUndefined()
  })

  it('retorna updated:0 sem chamar getTagsByIds quando não há tags pra adicionar/remover', async () => {
    const res = await POST(request({ ids: ['ct-1'], tagsToAdd: [], tagsToRemove: [] }))
    const body = await res.json()

    expect(body).toEqual({ updated: 0 })
    expect(getTagsByIdsMock).not.toHaveBeenCalled()
    expect(bulkUpdateTagsMock).not.toHaveBeenCalled()
  })
})
