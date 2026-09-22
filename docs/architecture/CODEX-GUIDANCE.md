
# Cuidam — Codex Engineering Guidance

Este arquivo é orientação de engenharia, não uma especificação de framework.

## Precedência
1. `docs/product/MVP-SPEC.md` define comportamento do produto.
2. `docs/brand/BRAND.md` define marca, voz e direção visual.
3. `docs/product/domain-model.json` é referência mínima do domínio.
4. `prototypes/prototipo_cuidam_mvp_v18.html` é referência visual/interacional, não fonte de verdade para regras.
5. Decisões novas de produto não devem ser inventadas pelo código. Quando uma decisão for necessária e mudar comportamento, parar e pedir confirmação.

## Guardrails técnicos
- Responsive web, mobile-first. PWA não é requisito.
- Persistência real; não usar localStorage como fonte de verdade.
- Regras críticas no backend/server.
- Autorização sempre por household.
- Operações concorrentes importantes devem ser transacionais/idempotentes: claim, complete, redeem e jobs.
- Ocorrências recorrentes precisam de geração idempotente.
- Histórico precisa preservar snapshots definidos pela especificação.
- Arquivamento/soft delete deve preservar histórico.
- Timezone da casa deve ser explícito para recorrência/jobs.
- Testes automatizados são obrigatórios para recorrência, concorrência e autorização.

## Liberdade de implementação
O Codex pode escolher framework, ORM, provider de auth, hospedagem, estrutura de pastas e detalhes de infraestrutura, desde que os requisitos do MVP sejam preservados.

## UX que não deve ser quebrada
- Hoje = execução.
- Nós = percepção.
- Casa = configuração.
- A ação principal deve estar imediatamente visível.
- Não adicionar etapas extras de onboarding só para preencher dados.
- Não transformar o produto em fiscal, placar ou sistema competitivo.
- `Casa → Tarefas` não existe.
- Não criar ranking, XP, níveis ou streaks.

## Antes de codar
Primeiro ler todo o conteúdo de `docs/` e inspecionar o protótipo.
Antes de começar uma implementação grande, apresentar: stack escolhida, arquitetura, modelo de dados final, estratégia de auth/autorização, jobs/recorrência e plano de testes.
