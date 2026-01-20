'use client';

import React from 'react';
import {
  MessageSquare,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react';
import { WebhookSubscription } from './types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';

interface WebhookSubscriptionStatusProps {
  webhookSubscription?: WebhookSubscription | null;
  webhookSubscriptionLoading?: boolean;
  webhookSubscriptionMutating?: boolean;
  onRefresh?: () => void;
  onSubscribe?: () => Promise<void>;
  onUnsubscribe?: () => Promise<void>;
}

export function WebhookSubscriptionStatus({
  webhookSubscription,
  webhookSubscriptionLoading,
  webhookSubscriptionMutating,
  onRefresh,
  onSubscribe,
  onUnsubscribe,
}: WebhookSubscriptionStatusProps) {
  const handleSubscribe = async () => {
    if (!onSubscribe) return;
    try {
      await onSubscribe();
    } catch {
      // toast handled in controller
    }
  };

  const handleUnsubscribe = async () => {
    if (!onUnsubscribe) return;
    try {
      await onUnsubscribe();
    } catch {
      // toast handled in controller
    }
  };

  const isLoading = webhookSubscriptionLoading || webhookSubscriptionMutating;

  return (
    <div className="bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-medium text-[var(--ds-text-primary)] mb-1 flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--ds-status-success-text)]" />
            Inscrição do webhook (campo:{' '}
            <span className="font-mono text-xs text-[var(--ds-status-success-text)]">messages</span>)
          </h4>
          <p className="text-xs text-[var(--ds-text-secondary)]">
            Isso autoriza a Meta a enviar eventos de <strong>mensagens</strong> para o seu
            webhook. É independente do override do número (Prioridade #1).
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)] rounded-lg transition-colors"
          title="Atualizar status"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          {webhookSubscriptionLoading ? (
            <>
              <Loader2 size={16} className="animate-spin text-[var(--ds-text-muted)]" />
              <span className="text-[var(--ds-text-muted)]">Consultando status…</span>
            </>
          ) : webhookSubscription?.ok ? (
            webhookSubscription.messagesSubscribed ? (
              <>
                <StatusBadge status="success" showDot>Ativo</StatusBadge>
                <span className="text-[var(--ds-text-muted)]">·</span>
                <span className="text-[var(--ds-text-secondary)] text-xs">
                  WABA: {webhookSubscription.wabaId}
                </span>
              </>
            ) : (
              <>
                <StatusBadge status="warning" showDot>Inativo (via API)</StatusBadge>
                <span className="text-[var(--ds-text-muted)]">·</span>
                <span className="text-[var(--ds-text-secondary)] text-xs">
                  WABA: {webhookSubscription.wabaId}
                </span>
              </>
            )
          ) : (
            <StatusBadge status="error" showDot>Erro ao consultar</StatusBadge>
          )}
        </div>

        {webhookSubscription && !webhookSubscriptionLoading && webhookSubscription.ok && (
          <div className="text-[11px] text-[var(--ds-text-muted)]">
            Campos ativos:{' '}
            {webhookSubscription.subscribedFields?.length
              ? webhookSubscription.subscribedFields.join(', ')
              : '—'}
          </div>
        )}

        {webhookSubscription &&
          !webhookSubscriptionLoading &&
          webhookSubscription.ok &&
          !webhookSubscription.messagesSubscribed && (
            <Alert variant="warning" className="py-2">
              <AlertDescription className="text-[11px] mt-0">
                Se no painel da Meta estiver "Ativo" e aqui não, pode haver atraso de propagação
                ou permissões do token. Clique em "Atualizar status" ou use "Ativar messages"
                para forçar via API.
              </AlertDescription>
            </Alert>
          )}

        {webhookSubscription &&
          !webhookSubscriptionLoading &&
          !webhookSubscription.ok &&
          webhookSubscription.error && (
            <Alert variant="error" className="py-2">
              <AlertDescription className="text-xs mt-0">
                {webhookSubscription.error}
              </AlertDescription>
            </Alert>
          )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSubscribe}
            disabled={isLoading || !onSubscribe}
            className="h-10 px-3 bg-[var(--ds-status-success)] hover:opacity-90 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            title="Inscrever messages via API"
          >
            {webhookSubscriptionMutating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Ativar messages
          </button>

          <button
            onClick={handleUnsubscribe}
            disabled={isLoading || !onUnsubscribe}
            className="h-10 px-3 bg-[var(--ds-bg-surface)] hover:bg-[var(--ds-bg-hover)] border border-[var(--ds-border-default)] rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            title="Desinscrever (remover subscription)"
          >
            {webhookSubscriptionMutating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Remover inscrição
          </button>
        </div>
      </div>
    </div>
  );
}
