
# Cuidam

Cuidam é um produto para dividir responsabilidades domésticas com menos cobrança e carga mental.

## Source of truth
- Produto: `docs/product/MVP-SPEC.md`
- Marca/voz: `docs/brand/BRAND.md`
- Domínio: `docs/product/domain-model.json`
- Referência visual: `prototypes/prototipo_cuidam_mvp_v18.html`
- Orientação de engenharia: `docs/architecture/CODEX-GUIDANCE.md`

Quando houver conflito, a especificação do produto prevalece sobre protótipo ou implementação anterior.

## Princípios do produto
- Dividir responsabilidades, não apenas tarefas.
- Hoje = execução; Nós = percepção; Casa = configuração.
- Lembrar, nunca cobrar.
- Sem ranking ou competição.
- Sugestões ajudam a começar, mas nunca limitam.
- Remover da rotina não apaga histórico.
- MVP otimizado para 2 pessoas; domínio preparado para 2+.
- Reduzir esforço e carga cognitiva é mais importante do que maximizar engajamento.

## Regras importantes
- Não inventar comportamento de produto.
- Não adicionar funcionalidades fora do MVP sem confirmação.
- Não usar localStorage como fonte de verdade.
- Regras críticas pertencem ao backend.
- Validar autorização por household no backend.
- Complete, claim, redeem e jobs devem ser seguros contra concorrência/idempotentes.
- Ocorrências recorrentes não podem duplicar.
- Histórico deve preservar snapshots definidos na especificação.

## UX
- Mobile-first responsive web.
- Touch targets >= 44px.
- Ação primária sempre óbvia.
- Mínima carga cognitiva.
- Não transformar a interface em uma lista gigante.
- Não criar `Casa -> Tarefas`.
- Evitar qualquer linguagem de cobrança, culpa ou competição.

## Marca
- Nome: `cuidam`.
- Assinatura: `Cada um cuida do que é seu.`
- Direção visual: `Raízes / acolhimento funcional`.
- Símbolo: casinha com elemento orgânico/folha interno.
- Verde principal: `#68BB7F`.
- Verde escuro: `#376B45`.
- Tipografia de referência: Poppins.

## Processo do Codex
1. Ler os arquivos de source of truth antes de implementar.
2. Inspecionar o protótipo V18 para entender fluxos e intenção visual.
3. Se uma decisão de produto estiver ambígua, não escolher silenciosamente: perguntar.
4. Rodar testes após mudanças de comportamento.
5. Não marcar uma feature como concluída sem validar os critérios de aceite relacionados.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
