# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato é baseado em **[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)** e este projeto segue **[Semantic Versioning](https://semver.org/lang/pt-BR/)**.

## [Unreleased]

### Added
- (pendente)

### Changed
- (pendente)

### Fixed
- (pendente)

## [2.0.0] - 2025-12-13

### Added
- Base do template **SmartZap v2** com Next.js (App Router), React e Tailwind.
- Módulos principais do CRM:
  - Dashboard com métricas.
  - Contatos: CRUD, tags, importação CSV e suporte a **campos personalizados**.
  - Templates: visualização/validação e suporte a geração com IA.
  - Campanhas: criação, detalhes e disparo em massa.
  - Configurações com fluxo/wizard para credenciais e integrações.
- Banco de dados **Supabase** com schema consolidado e índices para:
  - `campaigns`, `contacts`, `campaign_contacts` (snapshot de contato por campanha), `templates`, `settings`, `account_alerts`, `template_projects`, `template_project_items`, `custom_field_definitions`.
- Funções RPC no Postgres:
  - `get_dashboard_stats()` para estatísticas agregadas.
  - `increment_campaign_stat(campaign_id_input, field)` para incremento atômico de contadores.
- Realtime habilitado via `supabase_realtime` (publication) para entidades principais (campanhas, contatos, itens de campanha, alertas, etc.).
- Suporte a **multi-sessão** (auth) com gestão de tokens de sessão.
- UI de **edição rápida** de contato em contexto de campanhas (modal de quick edit).
- Pré-checagem (pre-check) para campanhas/contatos/variáveis, incluindo:
  - Rastreamento de parâmetros obrigatórios e fontes dos valores.
  - Mensagens de erro mais “humanizadas” para orientar correções.
- Testes unitários/integração com **Vitest** (configuração inicial).
- Configuração de lint com **ESLint** para Next.js + TypeScript.

### Changed
- Atualização do `@upstash/workflow` para `0.3.0-rc` e ajuste de `overrides` para `jsondiffpatch`.
- Remoção de configuração de headers CORS do `next.config.ts` (centralizando políticas na borda/infra quando aplicável).
- Melhoria de cache/controle de staleness em rotas de contatos (cabeçalhos) para reduzir “flash-back” de dados.
- Ajustes na visualização de campanha para considerar status **SKIPPED**.
- Refactors de organização/legibilidade e ajustes de fluxo em rotas (ex.: atualização de contatos e campos personalizados).

### Fixed
- Correções de tipos/valores nulos para timestamps de campanhas (ex.: `completedAt` indefinido → `null`).
- Correções no pre-check (`precheckContactForTemplate`) para diagnosticar valores faltantes com mais precisão.
- Melhorias no tratamento de erro do `contactService` em operações de leitura.
- Correção de import de rotas para o tipo correto.

### Removed
- Remoção de dependência do `@google/genai` do `package.json`.
- Remoção de alguns testes unitários legados de pricing do WhatsApp e schemas de validação (mantendo a suíte mais enxuta).

### Docs
- Atualizações no guia de configuração (`docs/GUIA_CONFIGURACAO.md`) com detalhes adicionais de setup/diagnóstico.

[Unreleased]: https://github.com/thaleslaray/smartzap/compare/613baf7...HEAD
[2.0.0]: https://github.com/thaleslaray/smartzap/compare/8505c0f...613baf7
