import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

import { WebhookAlertBanner } from './WebhookAlertBanner'

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

// Regression: ISSUE — WebhookAlertBanner escondia o aviso quando a própria
// checagem de status falhava (ex: token de acesso à Meta expirado), em vez
// de alertar — o cenário mais grave ficava invisível no dashboard.
// Found by /qa em 2026-07-15
describe('WebhookAlertBanner', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('mostra um alerta quando a checagem de status falha (ex: token expirado)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          ok: false,
          error:
            'Error validating access token: Session has expired on Monday, 13-Jul-26 16:00:00 PDT.',
        }),
    }) as unknown as typeof fetch

    renderWithQueryClient(<WebhookAlertBanner />)

    await waitFor(() => {
      expect(screen.getByText('Não foi possível verificar o status do webhook.')).toBeInTheDocument()
    })
  })

  it('não mostra nada quando o webhook está corretamente configurado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          smartzapWebhookUrl: 'https://smartzap.aaagencia.com.br/api/webhook',
          hierarchy: {
            phoneNumberOverride: null,
            wabaOverride: 'https://smartzap.aaagencia.com.br/api/webhook',
            appWebhook: null,
          },
        }),
    }) as unknown as typeof fetch

    renderWithQueryClient(<WebhookAlertBanner />)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    expect(screen.queryByText(/webhook/i)).toBeNull()
  })

  it('mostra um alerta quando a requisição falha por completo (ex: rede indisponível)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch

    renderWithQueryClient(<WebhookAlertBanner />)

    await waitFor(() => {
      expect(screen.getByText('Não foi possível verificar o status do webhook.')).toBeInTheDocument()
    })
  })
})
