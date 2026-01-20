'use client';

import React from 'react';
import { Zap, Copy, Check } from 'lucide-react';
import { DomainOption, WebhookStats } from './types';

interface WebhookUrlConfigProps {
  webhookUrl?: string;
  webhookToken?: string;
  webhookStats?: WebhookStats | null;
  availableDomains?: DomainOption[];
  selectedDomainUrl: string;
  onDomainChange: (url: string) => void;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  onTestUrl?: () => void;
  isTestingUrl?: boolean;
  showTestUrl?: boolean;
}

export function WebhookUrlConfig({
  webhookUrl,
  webhookToken,
  webhookStats,
  availableDomains,
  selectedDomainUrl,
  onDomainChange,
  copiedField,
  onCopy,
  onTestUrl,
  isTestingUrl,
  showTestUrl,
}: WebhookUrlConfigProps) {
  return (
    <div className="bg-[var(--ds-status-info-bg)] border border-[var(--ds-status-info)]/20 rounded-xl p-4 mb-6">
      <h4 className="font-medium text-[var(--ds-status-info-text)] mb-3 flex items-center gap-2">
        <Zap size={16} />
        URL do Webhook SmartZap
      </h4>

      {/* Domain Selector - only show if multiple domains available */}
      {availableDomains && availableDomains.length > 1 && (
        <div className="mb-4 p-3 bg-[var(--ds-bg-elevated)] rounded-lg border border-[var(--ds-border-subtle)]">
          <label className="block text-xs font-medium text-[var(--ds-text-secondary)] mb-2">
            Selecione o domínio para o webhook:
          </label>
          <select
            value={selectedDomainUrl}
            onChange={(e) => onDomainChange(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-lg text-sm text-[var(--ds-text-primary)] focus:ring-2 focus:ring-[var(--ds-status-info)]/50 focus:border-[var(--ds-status-info)]/50 outline-none"
          >
            <option value="">Automático (recomendado)</option>
            {availableDomains.map((domain) => (
              <option key={domain.url} value={domain.url}>
                {domain.url} {domain.recommended ? '★' : ''} ({domain.source})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[var(--ds-text-muted)] mt-1.5">
            Escolha qual domínio usar na URL do webhook. O ★ indica o recomendado.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex gap-2">
          <code className="flex-1 px-3 py-2 bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] rounded-lg font-mono text-sm text-[var(--ds-text-secondary)] break-all">
            {webhookUrl}
          </code>
          <button
            onClick={() => onCopy(webhookUrl || '', 'url')}
            className="h-10 px-3 bg-[var(--ds-bg-surface)] hover:bg-[var(--ds-bg-hover)] border border-[var(--ds-border-default)] rounded-lg transition-colors shrink-0"
            title="Copiar URL"
          >
            {copiedField === 'url' ? (
              <Check size={16} className="text-[var(--ds-status-success-text)]" />
            ) : (
              <Copy size={16} className="text-[var(--ds-text-muted)]" />
            )}
          </button>
          {showTestUrl ? (
            <button
              onClick={onTestUrl}
              disabled={isTestingUrl}
              className="h-10 px-3 bg-[var(--ds-status-info)]/20 hover:bg-[var(--ds-status-info)]/30 border border-[var(--ds-status-info)]/30 rounded-lg transition-colors text-xs text-[var(--ds-status-info-text)]"
              title="Testar URL"
            >
              {isTestingUrl ? 'Testando...' : 'Testar URL'}
            </button>
          ) : null}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-[var(--ds-text-muted)]">Token:</span>
          <code className="px-2 py-1 bg-[var(--ds-bg-elevated)] rounded text-xs font-mono text-[var(--ds-text-secondary)]">
            {webhookToken}
          </code>
          <button
            onClick={() => onCopy(webhookToken || '', 'token')}
            className="p-1 hover:bg-[var(--ds-bg-hover)] rounded transition-colors"
            title="Copiar Token"
          >
            {copiedField === 'token' ? (
              <Check size={12} className="text-[var(--ds-status-success-text)]" />
            ) : (
              <Copy size={12} className="text-[var(--ds-text-muted)]" />
            )}
          </button>
        </div>
      </div>

      {/* Webhook Status */}
      {webhookStats?.lastEventAt && (
        <div className="mt-3 pt-3 border-t border-[var(--ds-status-info)]/20 flex items-center gap-2 text-xs text-[var(--ds-status-info-text)]">
          <Check size={12} className="text-[var(--ds-status-success-text)]" />
          Último evento: {new Date(webhookStats.lastEventAt).toLocaleString('pt-BR')}
          <span className="text-[var(--ds-text-muted)]">·</span>
          <span>{webhookStats.todayDelivered || 0} delivered</span>
          <span className="text-[var(--ds-text-muted)]">·</span>
          <span>{webhookStats.todayRead || 0} read</span>
        </div>
      )}
    </div>
  );
}
