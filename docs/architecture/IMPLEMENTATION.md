# Cuidam — documentação de implementação

## Objetivo

Este documento acompanha a implementação do MVP e deve ser atualizado quando uma alteração mudar arquitetura, fluxo, persistência, contratos ou estratégia de testes. A fonte de verdade de produto continua sendo `docs/product/MVP-SPEC.md`.

## Estado atual

- Next.js 16 + React 19 + TypeScript.
- Supabase Auth preparado para cadastro, login e callback de confirmação.
- O modo mock é o padrão enquanto `NEXT_PUBLIC_CUIDAM_MOCK` não for `false`; ele usa APIs server-side e cookie de sessão, sem localStorage.
- Prisma/PostgreSQL preparado para persistir usuário, casa, membership e áreas.
- `GET/POST /api/onboarding` validam a sessão Supabase; o POST grava a casa em transação e é idempotente por conta.
- `User.activeHouseholdId` impede que a mesma conta crie casas ativas duplicadas; a criação usa lock de linha no banco.
- Onboarding visual com caminhos de cadastro e login.
- `/today` já exige sessão e apresenta o estado vazio da casa.
- No modo mock, `/today` permite adicionar e concluir tarefas usando o mesmo contrato de API que será ligado ao banco real.
- O formulário mock de tarefa cobre nome, área, responsabilidade, frequência e carga; cards de Hoje exibem esses dados e permitem concluir.
- No modo mock, `/nos` mostra o equilíbrio estimado da casa e permite expandir cada área para visualizar suas tarefas.
- Testes unitários com Vitest, Testing Library e jsdom; frontend cobre navegação do onboarding e backend cobre o schema real de `/api/onboarding`.

## Fluxo implementado

1. A pessoa escolhe criar conta ou entrar.
2. Cadastro/login usa Supabase Auth.
3. A pessoa informa o nome da casa e escolhe áreas.
4. Login consulta `/api/onboarding` e retoma a casa existente quando houver uma.
5. O frontend envia o payload para `/api/onboarding`.
6. O backend valida a sessão e grava User, Household, Membership e Areas sem duplicar a casa ativa.
7. A pessoa chega a `/today`, adiciona tarefas mockadas e pode concluí-las.
8. A aba `/nos` resume a divisão por área, frequência, responsabilidade e carga.

## Variáveis de ambiente

Para continuar em mock, não é necessário configurar ambiente. Para ativar a integração real, copie `.env.example` para `.env.local`, preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `DATABASE_URL`, e defina `NEXT_PUBLIC_CUIDAM_MOCK=false`.

## Comandos

```bash
npm run lint       # typecheck
npm test           # testes unitários
npm run test:watch # testes em modo observação
npm run build      # build de produção
```

## Próximas etapas

- implementar ocorrências e recorrência mockadas;
- completar a UI de edição de tarefas em Nós;
- depois configurar ambiente Supabase/PostgreSQL e trocar o repositório mock pelo persistido;
- implementar convites com token, expiração e envio;
- adicionar testes de autorização, concorrência e recorrência;
- adicionar testes E2E do fluxo cadastro → casa → tarefa → Hoje.

## Registro de alterações

### 2026-09-20

- Criada a base de testes frontend/backend com Vitest.
- Adicionados testes do onboarding e validação do payload.
- Documentada a arquitetura e o estado atual do MVP.
