# Cuidam — MVP Specification v2

Cuidam — MVP Specification v2

Fonte de verdade para Produto, UX/UI, Branding e Desenvolvimento

0. Status

Escopo do MVP congelado. Este documento elimina decisões implícitas para que o Codex possa implementar sem inventar regras de produto. Se uma mudança alterar comportamento, ela volta para Produto/UX.

1. Essência

Cuidam ajuda as pessoas de uma casa a dividir responsabilidades sem precisar ficar lembrando, cobrando ou supervisionando umas às outras.

Assinatura: “Cada um cuida do que é seu.”  |  Linha: “Menos cobrança. Mais parceria.”

2. Princípios

Dividir responsabilidades, não apenas tarefas.

Hoje = execução; Nós = percepção; Casa = configuração.

Ação rápida com mínima carga cognitiva.

Lembrar, nunca cobrar.

Sem ranking ou competição.

Sugestões reduzem trabalho, nunca limitam.

Não criar dívida artificial de tarefas.

Remover da rotina não apaga histórico.

MVP otimizado para 2 pessoas, domínio preparado para 2+.

Não otimizar por DAU/streak; otimizar por redução de esforço.

3. Escopo fechado

Conta: cadastro, login, recuperação.

Casa: 1 casa ativa por conta; máximo 2 membros no MVP.

Convite: email/token, estados pendente/aceito/cancelado/expirado/inválido.

Onboarding: entrada única, presets, primeira divisão, convite opcional.

Áreas: presets + criar/editar/ordenar/arquivar.

Tarefas: CRUD, área, responsável, frequência, carga, instruções.

Ocorrências: geração por recorrência, conclusão e missed.

Hoje: ocorrências da pessoa, progresso, concluir em 1 toque.

Nós: balanceamento, áreas, atividade recente.

Casa: Divisão, Pessoas, Áreas, Notificações; sem menu Tarefas.

Recompensas: saldo compartilhado, CRUD e resgate.

Notificações: lembretes agrupados, atividade opcional, quiet hours.

Histórico: persistido no backend; UI completa fora do MVP.

4. Navegação

Hoje: o que eu preciso fazer?

Nós: como a casa está funcionando?

Recompensas: saldo e recompensas.

Casa: como configuramos?

Não existe Casa → Tarefas nem uma lista global obrigatória de todas as tarefas. Tarefas são descobertas em Nós → Área → Tarefa ou criadas por Hoje → +.

5. Modelo mental

Área = onde. Tarefa = o que. Responsabilidade = quem garante. Ocorrência = instância daquele período. Executor = quem realizou.

A interface não deve exigir que a pessoa aprenda esses conceitos antes de agir.

6. Onboarding

Uma tela de entrada: proposta + Criar conta + Já tenho conta.

Cadastro: nome, email, senha.

Casa: nome padrão editável.

Convite opcional.

Sugestões de áreas/tarefas pré-selecionadas e editáveis.

Primeira divisão: aceitar sugestão ou ajustar.

Tela final curta → Hoje.

Convidado entra pelo convite e não refaz onboarding.

7. Áreas

Presets iniciais: Cozinha, Sala, Quartos, Banheiro, Escritório, Pets.

Criar, editar, ordenar e arquivar.

Arquivar não apaga tarefas/histórico.

Área pode ser escolhida ao cadastrar/editar tarefa.

No fluxo vindo de uma área, a categoria vem pré-selecionada.

Não tornar cadastro de áreas uma etapa obrigatória do onboarding.

8. Tarefas

Obrigatórios: nome, área, responsabilidade, recorrência, carga. Opcionais: horário e instruções.

Responsabilidade individual ou compartilhada (Nós).

Responsável garante que aconteça; executor pode ser diferente.

Transferência de responsabilidade fica fora do MVP.

Editar muda o futuro; ocorrências passadas mantêm snapshots.

Remover = arquivar, preservando histórico.

9. Tarefas compartilhadas

Qualquer membro pode assumir uma ocorrência.

“Vou cuidar” registra claim/executor em andamento.

Claim evita execução duplicada.

Concluir registra quem executou.

Responsabilidade continua compartilhada.

Claim abandonado expira no fim do período.

## 10. Recorrência

Diária: 1 ocorrência/dia.

X vezes/semana: meta, sem dias fixos.

Semanal: 1/semana.

A cada X semanas: intervalo definido.

Mensal: 1/mês.

Custom pode existir no domínio, mas UI avançada não é necessária no MVP.

Timezone da casa é referência.

Geração idempotente: nunca duplicar ocorrência.

Não concluída até o fim do período → MISSED; nunca vira dívida no período seguinte.

### 10.1 Decisões de calendário aprovadas

- A semana da casa começa na segunda-feira.
- Para `X vezes/semana`, existe uma ocorrência semanal com meta de conclusões (`0/X`), e não X cards repetidos. A interface mostra um único card com o progresso contextual.
- Uma recorrência mensal ancorada nos dias 29, 30 ou 31 acontece no último dia de meses que não tenham esse dia.
- Uma recorrência `a cada X semanas` é ancorada na data de criação da tarefa; essa data corresponde à primeira ocorrência.
- Qualquer membro pode concluir uma ocorrência de responsabilidade individual de outro membro. A responsabilidade original é preservada; quem executou fica registrado separadamente.

## 11. Hoje

Mostrar somente o necessário para executar.

Manter progressão contextual.

✓ Concluir direto no card, sem confirmação.

Detalhes ficam atrás da ação secundária.

Shared disponível pode mostrar “Vou cuidar”.

Após concluir, remover da lista ativa.

Não manter permanentemente “Feitas hoje”, “Hoje na sua responsabilidade” ou “Ver divisão”.

## 12. Nós

Resumo do equilíbrio.

Áreas como portas de entrada.

Cada área abre somente suas tarefas.

Dentro da área: ver, editar e adicionar.

Atividade é secundária.

Sem ranking, vencedor ou lista gigante.

## 13. Casa

Divisão.

Pessoas.

Áreas.

Notificações.

Não incluir Tarefas como menu. Casa não é catch-all.

## 14. Balanceamento — fechado

Carga: 1 muito leve, 2 leve, 3 moderada, 4 pesada, 5 muito pesada. É ordinal.

Algoritmo inicial: score por ocorrência = carga × fator de frequência decrescente. Para n ocorrências esperadas no período, usar fator 1 + 0,5×(n−1)/n. Responsabilidade individual recebe 100% do score. Shared permanece no household até execução.

Percentual entre membros é derivado dos scores. Estado: Bem equilibrada se diferença relativa ≤10%; Um pouco desequilibrada se >10% e ≤25%; Mais concentrada se >25%. Limiares ficam parametrizados no serviço.

A fórmula nunca aparece na UI e pode ser recalibrada após uso real.

## 15. Recompensas — fechado

Saldo compartilhado. Estrelas celebram contribuição; não medem valor humano.

Tabela inicial: carga 1→1, 2→2, 3→3, 4→4, 5→5; parametrizada.

Cada ocorrência concluída gera uma vez.

MISSED/CANCELLED não geram.

Shared gera para o saldo da casa uma vez.

Resgate é transacional e não pode deixar saldo negativo.

Qualquer membro pode resgatar recompensa disponível.

Recompensa arquivada não pode ser resgatada, histórico permanece.

Sem XP, níveis, streaks ou ranking.

## 16. Notificações

Lembrete matinal agrupado e configurável.

Nunca uma notificação por tarefa por padrão.

Atividade e shared notifications são opt-in.

Quiet hours bloqueia lembretes não críticos.

Push leva ao contexto; execução acontece no app.

Sem inbox interno.

## 17. Estados e erros

Loading: skeleton/placeholder curto.

Empty Hoje: explicar e oferecer primeira tarefa.

Empty Área: “Ainda não tem tarefas aqui” + adicionar.

Erro de rede: retry preservando intenção.

Sessão expirada: login sem perder intenção quando possível.

Conflito: informar e atualizar; não sobrescrever silenciosamente.

Permissão negada: mensagem neutra e ação possível.

## 18. Responsividade e acessibilidade

Responsive web mobile-first; PWA não é requisito.

Touch targets ≥44px.

Grid de 8px; margem mobile ~16px.

Contraste adequado.

Não depender apenas de cor.

Foco visível e labels corretos.

prefers-reduced-motion.

Som/haptics opcionais.

## 19. Branding — fonte de verdade

Nome: Cuidam. Direção: Raízes / acolhimento funcional.

Símbolo: casinha com folhinha/elemento orgânico interno; a folha é parte distintiva e deve permanecer. Evitar casa genérica, check, coração ou pessoas genéricas.

Paleta: #FAF7F2, #FFFFFF, #F1ECE4, #292A27, #777873, #68BB7F, #376B45, #8EC8FF, #F4C95D, #F58E8E, #FFB167.

Tipografia: Poppins. Regra visual: ~80% neutros + ~20% acentos.

Logo ainda precisa de refinamento final e clearance de marca antes de lançamento.

## 20. Domínio mínimo

User

Household

Membership

Invitation

Area

Task

TaskOccurrence

Reward

RewardRedemption

NotificationPreference

TaskOccurrence guarda snapshots de responsável, tipo de responsabilidade e carga. RewardRedemption guarda custo e destinatário no momento do resgate.

## 21. Segurança/integridade

Autorização sempre no backend por household.

Complete, redeem, claim e jobs devem ser idempotentes/seguros contra concorrência.

Convites com token aleatório, uso único, expiração e armazenamento seguro.

Soft delete/archive quando houver histórico.

Nunca usar localStorage como fonte de verdade.

## 22. Arquitetura

Requisitos: responsive web, persistência real, backend para regras de negócio, jobs para recorrência/notificações, armazenamento com integridade transacional.

O Codex escolhe framework, ORM, provider de auth, hospedagem e estrutura de código. Regras críticas não podem ficar apenas no frontend.

## 23. Analytics

onboarding_completed

invitation_sent

invitation_accepted

first_task_created

first_task_completed

task_completed

task_missed

shared_task_claimed

reward_redeemed

notification_opened

household_active_week

Analytics servem para aprendizado; não criar mecanismos de compulsão.

## 24. Critérios de aceite

Cadastro → Hoje funciona sem assistência.

Convite → segunda pessoa entra sem refazer onboarding.

Nós → qualquer área abre a lista correta daquela área.

Adicionar por área pré-seleciona categoria.

Editar permite alterar categoria.

Hoje mostra apenas ocorrências relevantes.

Concluir em um toque.

Missed não gera dívida.

Histórico preserva snapshots.

Balance é determinístico e server-side.

Redeem não deixa saldo negativo.

Casa não possui menu Tarefas.

Notificações respeitam preferências/quiet hours.

## 25. Testes obrigatórios

E2E: cadastro → casa → tarefa → Hoje → concluir.

E2E: convite → segunda pessoa.

E2E: Nós → cada área → lista correta → editar/adicionar.

E2E: shared claim → complete.

Recorrência + timezone + virada de período.

Missed sem carry-over.

Concorrência de claim/redeem.

Autorização entre households.

Arquivamento e histórico.

Responsive + acessibilidade básica.

## 26. Não inventar durante implementação

Ranking.

XP/níveis/streaks.

Chat.

Calendário completo.

Tela de histórico completa.

Transferência.

IA.

Gamificação adicional.

Casa → Tarefas.

Cobrança por notificação.

Etapas extras de onboarding.

## 27. Pós-MVP

Transferência.

Redistribuição automática.

Histórico visual.

Calendário.

3+ membros na UX.

Múltiplas casas.

Economia avançada.

IA.

Casa virtual/evolutiva.

## 28. Definição de pronto para o Codex

O comportamento do MVP está definido. O protótipo V18 e os assets de branding servem como referência visual. O Codex pode tomar decisões de implementação, mas qualquer nova decisão de produto deve voltar para Produto/UX.


> SOURCE OF TRUTH: product behavior for the MVP. When another document or prototype conflicts with this file, this file wins.
