# Cuidam — documentação de implementação

## Objetivo

Este documento acompanha a implementação do MVP e deve ser atualizado quando uma alteração mudar arquitetura, fluxo, persistência, contratos ou estratégia de testes. A fonte de verdade de produto continua sendo `docs/product/MVP-SPEC.md`.

## Estado atual

- Next.js 16 + React 19 + TypeScript.
- Supabase Auth preparado para cadastro, login e callback de confirmação.
- O modo mock é o padrão enquanto `NEXT_PUBLIC_CUIDAM_MOCK` não for `false`; ele usa APIs server-side e cookie de sessão, sem localStorage.
- Prisma/PostgreSQL preparado para persistir usuário, casa, membership e áreas.
- `GET/POST /api/onboarding` validam a sessão Supabase; o POST grava a casa em transação e é idempotente por conta.
- `User.activeHouseholdId` aponta a casa ativa da conta; várias contas podem apontar para a mesma casa, respeitando o limite de membros do MVP. A criação usa lock de linha no banco para impedir casas duplicadas por conta.
- Onboarding visual com caminhos de cadastro e login.
- `/today` já exige sessão e apresenta o estado vazio da casa.
- No modo mock, `/today` permite adicionar e concluir tarefas usando o mesmo contrato de API que será ligado ao banco real.
- O formulário mock de tarefa cobre nome, área, responsabilidade, frequência e carga; cards de Hoje exibem esses dados e permitem concluir.
- No modo mock, `/nos` mostra o equilíbrio estimado da casa e permite expandir cada área para visualizar suas tarefas.
- Testes unitários com Vitest, Testing Library e jsdom, com cobertura V8 e relatórios text/html/lcov.
- Playwright instalado para E2E real de cadastro/login, casa, tarefas, convite, isolamento entre casas e concorrência de reserva/resgate. A execução requer projeto Supabase/PostgreSQL exclusivo, descrito em `docs/architecture/E2E-TESTS.md`.

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
npm run test:coverage # testes unitários com relatório de cobertura
npm run test:e2e    # E2E no projeto Supabase isolado
npm run db:migrate:deploy:e2e # migrações do banco E2E isolado
npm run test:watch # testes em modo observação
npm run build      # build de produção
```

## Próximas etapas

- validar a entrega real de lembretes e o comportamento de silêncio; hoje a tela salva preferências, mas a entrega de notificações ainda precisa ser demonstrada ponta a ponta.

### Auditoria de aceite — 2026-11-16

- `npm test`: 66 testes passaram em 23 arquivos; `npm run lint` passou.
- No preview, foram conferidos Hoje, áreas e tarefas em Nós, criação/edição com a área selecionada, preferências de notificação e Recompensas.
- A reserva compartilhada de teste foi concluída até a meta semanal e creditou estrelas. Um resgate de recompensa de teste debitou o saldo e apareceu no histórico; a recompensa de teste foi arquivada.
- A rota de Recompensas respondeu com sucesso, mas levou cerca de 2,7 s nessa sessão. Não houve erro de runtime reportado para a rota no período consultado.
- O fluxo de recuperação de senha foi validado pelo usuário no preview. A auditoria atual não repetiu o fluxo de duas contas/navegadores para convite.
- A suíte E2E foi executada somente no projeto Supabase/PostgreSQL isolado; ela não foi apontada ao projeto preview.
- O próximo marco é validar ponta a ponta a entrega dos lembretes e o respeito ao silêncio configurado.

## Registro de alterações

### 2026-09-20

- Criada a base de testes frontend/backend com Vitest.
- Adicionados testes do onboarding e validação do payload.
- Documentada a arquitetura e o estado atual do MVP.

### 2026-11-15

- Recuperação de senha usa o template padrão do Supabase (`.ConfirmationURL`), troca o código PKCE em `/auth/callback` no servidor e permite atualizar a senha apenas com a sessão de recuperação. Isso funciona sem custom SMTP ou edição do HTML do e-mail; o link precisa ser aberto no mesmo navegador/perfil que pediu a recuperação.
- A página de redefinição valida a sessão antes de permitir `auth.updateUser`; a confirmação do pedido não revela se existe uma conta para o e-mail. A opção não aparece no modo mock.
- O projeto Supabase precisa usar o template de recuperação documentado em `docs/architecture/SUPABASE-AUTH-SETUP.md`. Testes cobrem solicitação, confirmação, erros, senha e atualização autenticada.

### 2026-11-16

- Instalados `@vitest/coverage-v8` e Playwright; configurados relatórios de cobertura V8.
- Criados testes E2E com Chromium para cadastro, login/retomada, tarefas, convite da segunda pessoa, disputa concorrente de reserva, isolamento entre casas e resgate idempotente.
- Configuração E2E exige `.env.e2e` e bloqueia reuso de URL/credenciais do projeto normal. O servidor Next recebe apenas a chave anon e credenciais do banco isolado; service role fica apenas na limpeza dos dados E2E.
- Documentadas preparação e execução em `docs/architecture/E2E-TESTS.md`.
- E2E executado no banco isolado: cadastro/casa/tarefa/convite, concorrência de reserva e resgate, isolamento, virada de período diária, ocorrência `MISSED` sem dívida, novos snapshots após edição, idempotência de geração e preservação do histórico ao arquivar. As contas de teste foram removidas pelo teardown.

