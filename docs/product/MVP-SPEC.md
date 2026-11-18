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

Hoje = execução; Nós = percepção; Configurações = configuração da casa.

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

Casa: 1 casa ativa por conta; máximo 2 membros no MVP. Pode ser usada por uma pessoa só; convidar alguém é opcional. Uma pessoa pode sair da casa para aceitar convite de outra. Se a última pessoa sair, a casa é desativada, sem apagar dados ou histórico. Uma pessoa que já fez parte dela pode reativá-la quando estiver sem casa ativa. Múltiplas casas ativas por conta ficam fora do MVP.

Convite: email/token, estados pendente/aceito/cancelado/expirado/inválido.

Onboarding: entrada única, presets, primeira divisão, convite opcional.

Áreas: presets + criar/editar/excluir.

Tarefas: CRUD, área, responsável, frequência e instruções. A estimativa de esforço é configurada pelo produto para a rotina já começar pronta.

Ocorrências: geração por recorrência, conclusão e missed.

Hoje: ocorrências da pessoa, progresso, concluir em 1 toque.

Nós: visão direta de quem cuida de cada tarefa, agrupada por pessoa e responsabilidades compartilhadas, sem pontuação ou feed de atividade.

Configurações: Pessoas e organização de áreas com suas tarefas; sem menu global de Tarefas.

Recompensas: saldo compartilhado, CRUD e resgate.

Histórico: persistido no backend; UI completa fora do MVP.

4. Navegação

Hoje: o que eu preciso fazer?

Nós: quem cuida do quê?

Recompensas: saldo e recompensas.

Configurações: como organizamos esta casa?

Não existe uma lista global obrigatória de tarefas. Tarefas são consultadas em Nós → Área e gerenciadas em Configurações → Área → Tarefas; também podem ser criadas por Hoje → +.

5. Modelo mental

Área = onde. Tarefa = o que. Responsabilidade = quem garante. Ocorrência = instância daquele período. Executor = quem realizou.

A interface não deve exigir que a pessoa aprenda esses conceitos antes de agir.

6. Onboarding

Uma tela de entrada: proposta + Criar conta + Já tenho conta.

Cadastro: nome, email, senha. A casa pode ser organizada por uma pessoa só; convidar alguém é opcional.

Casa: nome padrão editável.

Convite opcional.

Sugestões de áreas/tarefas pré-selecionadas e editáveis. Cada área oferece ao menos quatro sugestões de rotina. O conjunto inicial fica marcado para a casa começar pronta; alternativas adicionais ficam desmarcadas e podem ser escolhidas num painel com rolagem interna.

Primeira divisão: aceitar sugestão ou ajustar.

Tela final curta → Hoje.

Convidado entra pelo convite e não refaz onboarding.

7. Áreas

Presets iniciais: Cozinha, Sala, Quartos, Banheiro, Escritório, Pets.

Criar, editar e excluir.

Excluir uma área remove-a da organização ativa e encerra as tarefas ativas dela. Os registros permanecem guardados para preservar ocorrências e histórico.

Arquivar não apaga tarefas/histórico.

Área pode ser escolhida ao cadastrar/editar tarefa.

No fluxo vindo de uma área, a categoria vem pré-selecionada.

Não tornar cadastro de áreas uma etapa obrigatória do onboarding.

8. Tarefas

Obrigatórios para a pessoa: nome, área, responsabilidade e recorrência. Opcionais: horário e instruções.

A estimativa interna de esforço não é um passo de configuração. Sugestões já vêm com estimativa definida; tarefa criada manualmente recebe o padrão moderado (3 de 5). O valor não aparece nas telas do dia a dia. Pode ser ajustado opcionalmente em “Editar tarefa”, com explicação de que influencia a visão da divisão e as estrelas.

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

Visão de leitura das responsabilidades da casa, organizada por pessoa.

Mostrar as tarefas sob responsabilidade da pessoa atual, da outra pessoa e as compartilhadas em grupos separados. Em cada tarefa, mostrar também a área e a frequência para que seja fácil entender o que está com cada pessoa.

Quando a casa tiver uma pessoa, mostrar somente o grupo da pessoa atual e o grupo de tarefas compartilhadas. Se uma tarefa estiver atribuída à outra pessoa antes de ela entrar, mostrar também esse grupo.

Não exibir percentuais, notas ou julgamentos de equilíbrio. A carga é interna e não deve transformar a visão em uma medida de justiça.

Não permitir criar, editar ou arquivar tarefas nesta tela. A gestão fica em Configurações → área → tarefas; Hoje mantém o atalho para criar uma tarefa.

Não exibir feed de conclusões ou atividade recente nesta tela; evitar aparência de acompanhamento ou fiscalização.

Sem ranking, vencedor ou lista gigante.

## 13. Configurações da casa

Pessoas e convites.

Áreas: criar, editar e excluir, preservando o histórico das tarefas relacionadas.

Tarefas agrupadas dentro de cada área: criar, editar e remover da rotina. Não incluir uma lista global ou item de menu Tarefas. Casa não é catch-all.

Notificações ficam fora do escopo web.

## 14. Estimativa de esforço — fechado

Carga: 1 muito leve, 2 leve, 3 moderada, 4 pesada, 5 muito pesada. É ordinal.

Essa estimativa é uma referência interna para preparar a primeira divisão, não uma medida exata de justiça. A pessoa pode começar sem configurá-la e, se necessário, ajustá-la na edição da tarefa. Não mostrar o valor numérico nas telas de rotina, resumo ou onboarding.

Sugestões já vêm com esforço definido; tarefa criada manualmente recebe o padrão 3. O valor não aparece nas telas de rotina, na visão Nós ou no onboarding. Pode ser ajustado opcionalmente ao editar uma tarefa em Configurações, com explicação simples. O esforço define as estrelas base por conclusão; metas com várias conclusões na mesma ocorrência multiplicam essa base pela quantidade exigida, liberando o total apenas quando a meta é concluída.

## 15. Recompensas — fechado

Saldo compartilhado. Estrelas celebram contribuição; não medem valor humano.

Cada casa nova começa com sugestões editáveis: escolher o filme da noite (30), jantar especial em casa (70) e pizza para dividir (140). Casas existentes sem recompensas veem as mesmas sugestões e podem adicioná-las. Qualquer casa pode criar, ajustar ou remover recompensas.

A carga continua ordinal (1–5) e define as estrelas por conclusão. Uma ocorrência diária, semanal ou mensal completa rende sua carga. Para uma meta semanal de X conclusões, rende carga × X estrelas uma única vez, ao atingir a meta. Frequência maior gera mais estrelas ao longo do tempo porque há mais conclusões exigidas; ocorrência incompleta ou perdida não gera estrelas.

Os valores sugeridos são referências de partida, não equivalem a dinheiro. No conjunto inicial completo, as tarefas selecionadas representam aproximadamente 57 estrelas por semana; isso deixa o cinema como uma recompensa pequena, o jantar como intermediária e a pizza como uma meta maior. Cada casa pode ajustar nomes e custos à própria rotina.

Cada ocorrência concluída gera uma vez, no valor calculado pela carga e pela quantidade de conclusões exigidas naquela ocorrência.

MISSED/CANCELLED não geram.

Shared gera para o saldo da casa uma vez.

Resgate é transacional e não pode deixar saldo negativo.

Qualquer membro pode resgatar recompensa disponível.

Recompensa arquivada não pode ser resgatada, histórico permanece.

Sem XP, níveis, streaks ou ranking.

## 16. Notificações — pós-MVP

Fora do escopo da versão web do MVP. Retomar ao desenvolver o app mobile.

Lembrete matinal agrupado e configurável.

Nunca uma notificação por tarefa por padrão.

Atividade e shared notifications são opt-in.

Quiet hours bloqueia lembretes não críticos.

Push leva ao contexto; execução acontece no app.

Sem inbox interno.

## 17. Estados e erros

Loading: skeleton/placeholder curto.

Empty Hoje: explicar e oferecer primeira tarefa.

Empty Área em Nós: “Ainda não tem tarefas nesta área”. Para adicionar, acessar Configurações ou usar o atalho de criação em Hoje.

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

Requisitos: responsive web, persistência real, backend para regras de negócio, jobs para recorrência, armazenamento com integridade transacional.

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

Onboarding permite começar sem configurar estimativas de esforço; sugestões mantêm seus valores prontos e tarefas manuais usam o padrão 3.

Estimativa não aparece nas listas comuns; edição permite ajuste opcional com explicação simples.

Uma pessoa consegue criar e usar uma casa sem convidar outra.

Convite → segunda pessoa entra sem refazer onboarding.

Ao sair a última pessoa, a casa é desativada e uma antiga pessoa membro pode reabri-la sem perder o histórico.

Nós → tarefas aparecem em grupos claros por pessoa e responsabilidade compartilhada, com área e frequência em cada item.

Configurações → área permite criar, editar, remover tarefas da rotina e ajustar opcionalmente seu esforço.

Adicionar por área pré-seleciona categoria.

Editar permite alterar categoria.

Hoje mostra apenas ocorrências relevantes.

Concluir em um toque.

Missed não gera dívida.

Histórico preserva snapshots.

Estimativa de esforço não aparece nas telas de uso diário.

Uma casa nova recebe recompensas de partida; uma casa existente sem recompensas pode adicionar as mesmas sugestões. Concluir uma tarefa mais vezes na meta da semana rende estrelas proporcionais ao número de conclusões exigidas.

Redeem não deixa saldo negativo.

Casa não possui menu Tarefas.

Notificações ficam fora do escopo web; retomar ao desenvolver o app mobile.

## 25. Testes obrigatórios

E2E: cadastro → casa → tarefa → Hoje → concluir.

E2E: convite → segunda pessoa.

E2E: Nós → tarefas agrupadas pela pessoa responsável e pelas compartilhadas, sem ações de edição.

E2E: Configurações → área → criar/editar/remover tarefa e excluir área com histórico preservado.

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
