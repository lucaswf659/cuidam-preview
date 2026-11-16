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

- Adicionar uma suíte E2E contra um projeto Supabase isolado para cadastro/login, retomada da casa, tarefas, convite com uma segunda conta e conclusão compartilhada.
- Cobrir com PostgreSQL as garantias de concorrência/idempotência de reserva e resgate, mais autorização entre casas.
- Validar em integração com banco a recorrência, ocorrências perdidas, snapshots do histórico e arquivamento.
- Validar a entrega real de lembretes e o comportamento de silêncio; a tela salva preferências, mas a entrega ainda precisa ser demonstrada ponta a ponta.

## Registro de alterações

### 2026-09-20

- Criada a base de testes frontend/backend com Vitest.
- Adicionados testes do onboarding e validação do payload.
- Documentada a arquitetura e o estado atual do MVP.

### 2026-11-15 — Preferências de notificação

- Adicionada tela `Casa → Notificações` para configurar lembrete matinal agrupado, atividade, tarefas compartilhadas e quiet hours.
- Preferências reais são isoladas pelo membership autenticado e persistidas no `NotificationPreference` existente; horários inválidos ou iguais são rejeitados.
- Modo mock mantém as preferências associadas à sessão enquanto a instância do servidor estiver ativa.
- A regra de quiet hours considera intervalos que cruzam a meia-noite. A integração de entrega push e o agendamento de envios dependem do serviço de notificação e das credenciais de infraestrutura, ausentes nesta etapa.

### 2026-11-15 — Recuperação de senha

- O pedido usa o template padrão (`.ConfirmationURL`) do Supabase e troca o código PKCE em `/auth/callback`. A sessão de recuperação fica nos cookies; o link deve ser aberto no mesmo navegador/perfil que iniciou o pedido.
- A página de confirmação exige uma ação explícita antes de consumir o token; isso evita que pré-visualizações automáticas do e-mail o utilizem.
- A nova senha só pode ser atualizada com a sessão criada pela confirmação. A resposta do pedido é neutra para não revelar se há uma conta e a opção não aparece no modo mock.
- O template Reset Password do Supabase precisa seguir `docs/architecture/SUPABASE-AUTH-SETUP.md`.

### 2026-11-16 — Auditoria de aceite do preview

- `npm test`: 51 testes passaram em 18 arquivos; `npm run lint` passou.
- No preview, foram conferidos Hoje, áreas e tarefas em Nós, criação/edição com a área selecionada, preferências de notificação e Recompensas.
- A reserva compartilhada de teste foi concluída até a meta semanal e creditou estrelas. Um resgate de recompensa de teste debitou o saldo e apareceu no histórico; a recompensa de teste foi arquivada.
- A rota de Recompensas respondeu com sucesso, mas levou cerca de 2,7 s nesta sessão. Não houve erro de runtime reportado para a rota no período consultado.
- O fluxo de recuperação de senha foi validado pelo usuário no preview. A auditoria atual não repetiu o fluxo de duas contas/navegadores para convite.
- Ainda não há evidência de E2E real contra o banco para isolamento entre casas, corridas concorrentes, preservação de snapshots/arquivamento ou entrega de notificações. Os testes unitários existentes não substituem essas verificações integradas.
- Próximo marco: automatizar os fluxos críticos num projeto de teste isolado, começando por autorização entre casas e concorrência de reserva/resgate; em seguida fechar recorrência/histórico e entrega de notificações.
