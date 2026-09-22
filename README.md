
# Cuidam — Codex Handoff

Este pacote é a passagem de Produto/UX/Branding para implementação.

## Conteúdo
- `AGENTS.md` — instruções persistentes para o Codex.
- `docs/product/MVP-SPEC.md` — fonte de verdade do comportamento do MVP.
- `docs/product/domain-model.json` — domínio mínimo.
- `docs/brand/BRAND.md` — fonte de verdade da marca e voz.
- `docs/architecture/CODEX-GUIDANCE.md` — guardrails técnicos sem travar a stack.
- `prototypes/prototipo_cuidam_mvp_v18.html` — protótipo de referência.
- `assets/brand/` — assets exploratórios e design tokens.

## Importante
Não há backlog neste pacote. A intenção é deixar o Codex fazer o planejamento técnico e a implementação a partir das especificações.

O protótipo é referência visual/interacional. As regras de produto ficam na especificação v2.

## Modos de execução

O projeto inicia em modo mock para validação visual (`NEXT_PUBLIC_CUIDAM_MOCK=true`).
Para usar persistência e autenticação reais, configure `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `DATABASE_URL` em `.env.local`, altere
`NEXT_PUBLIC_CUIDAM_MOCK=false` e aplique `npx prisma migrate deploy`.

A migration inicial está em `prisma/migrations/20260921000000_init`.

O avanço de períodos pode ser executado por um scheduler externo chamando
`POST /api/jobs/occurrences` com `Authorization: Bearer $CUIDAM_CRON_SECRET`.
Ocorrências pendentes de períodos anteriores são marcadas como `MISSED`; elas
não são carregadas para o período seguinte.

## Primeira tarefa no Codex
Não começar codificando imediatamente. Primeiro ler tudo, analisar o protótipo e devolver uma proposta técnica com stack, arquitetura, dados, autenticação/autorização, recorrência/jobs e estratégia de testes. Nenhuma decisão de produto nova deve ser inventada nessa etapa.
