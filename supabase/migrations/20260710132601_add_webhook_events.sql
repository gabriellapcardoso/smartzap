-- Fase 7+8 do ecossistema aaagência: log de eventos de webhook disparados
-- pro Gerador de Propostas quando um contato é marcado como "Qualificado".
-- Mesmo shape de crm_webhook_events (Gerador de Propostas, migration 0015) —
-- padrão já validado em produção pra "log + botão de reenvio manual".

CREATE TABLE public.smartzap_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  event_id text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou')),
  attempt_count int NOT NULL DEFAULT 0,
  response_status int,
  erro text,
  cliente_id text,
  last_attempt_at timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, event_id)
);

CREATE INDEX smartzap_webhook_events_contact_id_idx ON public.smartzap_webhook_events (contact_id);
CREATE INDEX smartzap_webhook_events_status_idx ON public.smartzap_webhook_events (status);

ALTER TABLE public.smartzap_webhook_events ENABLE ROW LEVEL SECURITY;
-- Sem policy de anon/authenticated: acessada só via API routes com
-- getSupabaseAdmin() (service_role bypassa RLS), mesmo padrão do resto
-- das tabelas administrativas deste projeto single-tenant.
