-- =============================================================================
-- Adiciona configurações de reaction e quote nos agentes de IA
-- =============================================================================
-- Permite habilitar/desabilitar as tools de reaction (emoji) e quote (citação)
-- por agente. Útil para controlar o comportamento do bot.
-- =============================================================================

ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS allow_reactions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_quotes BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.ai_agents.allow_reactions IS 'Permite que o agente envie reações (emoji) às mensagens do usuário';
COMMENT ON COLUMN public.ai_agents.allow_quotes IS 'Permite que o agente cite mensagens do usuário nas respostas';
