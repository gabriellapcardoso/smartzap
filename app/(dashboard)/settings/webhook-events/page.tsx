'use client'

import { useEffect, useState, useCallback } from 'react'

interface WebhookEvent {
  id: string
  contact_id: string
  event_id: string
  status: 'pendente' | 'enviado' | 'falhou'
  attempt_count: number
  erro: string | null
  last_attempt_at: string | null
  criado_em: string
}

// UI mínima de reenvio (Fase 7+8) — fecha o gap de "log sem recuperação"
// apontado na revisão de engenharia. Lista todos os eventos (não só falha),
// mas o botão de reenvio só aparece pros que falharam.
export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setIsLoading(true)
    setErro(null)
    try {
      const res = await fetch('/api/webhook-events')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar eventos')
      setEvents(data.events)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function reenviar(id: string) {
    setResendingId(id)
    try {
      const res = await fetch(`/api/webhook-events/${id}/resend`, { method: 'POST' })
      await res.json()
      await carregar()
    } finally {
      setResendingId(null)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-100 mb-1">Eventos de webhook — lead qualificado</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Envios pro Gerador de Propostas quando um contato é marcado como Qualificado.
      </p>

      {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}
      {isLoading && <p className="text-zinc-400 text-sm">Carregando...</p>}

      {!isLoading && events.length === 0 && (
        <p className="text-zinc-500 text-sm">Nenhum evento registrado ainda.</p>
      )}

      {!isLoading && events.length > 0 && (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-zinc-400 border-b border-zinc-800">
              <th className="py-2 pr-4">Contato</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Tentativas</th>
              <th className="py-2 pr-4">Erro</th>
              <th className="py-2 pr-4">Última tentativa</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-zinc-900 text-zinc-200">
                <td className="py-2 pr-4">{event.contact_id}</td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      event.status === 'enviado'
                        ? 'text-primary-500'
                        : event.status === 'falhou'
                          ? 'text-red-400'
                          : 'text-zinc-400'
                    }
                  >
                    {event.status}
                  </span>
                </td>
                <td className="py-2 pr-4">{event.attempt_count}</td>
                <td className="py-2 pr-4 text-zinc-400">{event.erro ?? '-'}</td>
                <td className="py-2 pr-4 text-zinc-400">
                  {event.last_attempt_at ? new Date(event.last_attempt_at).toLocaleString('pt-BR') : '-'}
                </td>
                <td className="py-2 pr-4">
                  {event.status === 'falhou' && (
                    <button
                      onClick={() => reenviar(event.id)}
                      disabled={resendingId === event.id}
                      className="text-primary-500 hover:text-primary-400 disabled:opacity-50 text-sm"
                    >
                      {resendingId === event.id ? 'Reenviando...' : 'Reenviar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
