# Cuidam — prioridades e próximos passos

Este documento mantém o plano de evolução do produto. A especificação de escopo e comportamento do MVP continua em [`MVP-SPEC.md`](./MVP-SPEC.md). Itens de ideias futuras não são compromisso de implementação até serem priorizados.

## Direção acordada

1. Priorizar a conclusão do app móvel Android-first em React Native/Expo, compartilhando o backend e o Supabase.
2. Manter a versão web funcionando com correções necessárias, sem ampliar seu escopo durante o ciclo móvel.
3. Validar os fluxos móveis antes de abrir um beta maior ou iniciar a publicação.
4. Definir um modelo de negócio sustentável sem prejudicar a experiência acolhedora do Cuidam.
5. Publicar primeiro no Google Play; avaliar publicação iOS na etapa móvel, sem iniciar agora o trabalho específico da App Store.

## Prioridade 0 — concluir o MVP móvel Android

### 1. Completar os fluxos de entrada no app — próximo passo

- A fundação Expo/React Native, a sessão segura e a autenticação Bearer já existem; Hoje está parcialmente implementado. Ver [`ANDROID-APP-PLAN.md`](../architecture/ANDROID-APP-PLAN.md) para o estado técnico detalhado.
- Implementar cadastro, login, confirmação e recuperação de conta em telas nativas; manter links de e-mail funcionando entre dispositivos com deep links e fallback web.
- Implementar criação e configuração inicial da casa no app, além de aceitar convite para contas novas e existentes, sem mandar o usuário para a web para concluir o fluxo.
- Cobrir estados de carregamento, erros de rede, sessão expirada e navegação protegida.

### 2. Completar os módulos essenciais do MVP no app — a seguir

- Finalizar Hoje: filtros por cômodo, prazos, reivindicar/transferir responsabilidade e concluir tarefas, seguindo as mesmas regras do backend web.
- Implementar Nós, recompensas e Configurações em navegação móvel clara e responsiva, preservando autorização por casa e as regras atuais de estrelas e resgates.
- Manter push, login Google, modo infantil e recursos fora do MVP adiados; não criar fluxos móveis que dependam deles.

### 3. Validar o beta Android antes da loja

- Criar cobertura E2E em emulador Android para cadastro/entrada, convite e deep link, tarefas, recompensas e sessão após reiniciar o app.
- Testar falhas de rede, reabertura de links em outro navegador/dispositivo e comportamento com casas de uma e duas pessoas.
- Executar E2E somente contra projeto Supabase isolado; nunca embutir segredos administrativos ou acessar diretamente as tabelas do app.
- Distribuir primeiro por teste interno/fechado e corrigir os bloqueios encontrados antes de preparar lançamento público.

## Prioridade 1 — manter a web estável

### 4. Correções e validação da versão web — manutenção

- Corrigir regressões e problemas de segurança/infraestrutura que bloqueiem o uso; evitar adicionar novos módulos web enquanto o MVP móvel não estiver validado.
- Preservar a baseline de tarefas e recompensas já implementada: estimativas padrão, estrelas proporcionais ao esforço e sugestões iniciais de recompensas.
- Reutilizar os testes unitários e E2E existentes para proteger os fluxos compartilhados entre web e app.

## Prioridade 2 — preparar o piloto e a operação

### 5. Entrar com Google — adiado

- Retomar depois. Quando priorizado, configurar o cliente OAuth no Google Cloud e o provedor no Supabase, registrar redirects de desenvolvimento/preview/produção, implementar o fluxo web e testar contas novas/existentes, callback em outro dispositivo e e-mail já cadastrado.

### 6. Personalizar e revisar os e-mails — a fazer

- Criar templates de confirmação e recuperação de senha com identidade do Cuidam, texto claro, remetente reconhecível e links corretos.
- Revisar visualização em celular, texto puro, validade e destino dos links.
- Acompanhar entregabilidade e spam depois de atualizar os templates; Resend e o domínio de envio já foram configurados e um envio de teste chegou.
- Não afirmar que convites são enviados por e-mail enquanto o fluxo continuar gerando apenas um link para compartilhar.

### 7. Criar um contato corporativo — a fazer

- Definir provedor e endereço público de contato no domínio Cuidam, por exemplo `contato@cuidam.app.br`.
- Configurar caixa de entrada, recuperação de acesso e assinatura da marca.
- Usar esse endereço nos dados de suporte, política de privacidade e cadastro das lojas quando fizer sentido.

### 8. Revisar infraestrutura, segurança e operação — a fazer antes de ampliar o piloto

- Confirmar quais projetos Supabase são de desenvolvimento, E2E, preview e produção; conferir variáveis de ambiente e URLs autorizadas em cada um.
- Verificar que a migration de RLS está aplicada no projeto real e testar que dados de uma casa não podem ser lidos por outra.
- Revisar privilégios de chaves, backups e recuperação, limites de autenticação, logs, alertas e processo de resposta a incidentes.
- Rever política de privacidade, retenção e exclusão de conta/dados antes de abrir cadastro para mais pessoas.
- Manter testes E2E apontados somente ao projeto isolado.

### 9. Mapear a jornada e a navegação dos usuários — prioridade para o piloto

- Entender de onde as pessoas chegam (convite, landing page, busca orgânica, indicação ou anúncio) e em quais etapas avançam ou desistem.
- Acompanhar o caminho até o primeiro valor: abrir o app, concluir cadastro, criar/entrar em uma casa, criar e concluir a primeira tarefa, convidar/receber a segunda pessoa e voltar a usar a casa.
- Usar os eventos de produto definidos no MVP, como `onboarding_completed`, `first_task_created`, `first_task_completed`, `invitation_accepted` e `household_active_week`; confirmar a lista completa na instrumentação antes de lançar.
- Avaliar ativação e retenção por casa, além de usuários individuais, para saber se a divisão doméstica está funcionando para o grupo.
- Medir origem, conversão e pontos de abandono com dados agregados. Não registrar e-mails, nomes de tarefas ou outros conteúdos privados em ferramentas de analytics; avaliar consentimento, retenção e política de privacidade antes de ativar coleta.

## Prioridade 3 — validar valor e modelo de negócio

### 10. Pesquisar monetização — explorar, sem decisão tomada

- Comparar freemium e anúncios com conversas e testes com usuários; não implementar nenhum modelo até entender o valor que as pessoas usam e pelo que pagariam.
- Investigar primeiro benefícios premium compatíveis com a proposta, como recursos adicionais para casas, sem limitar o uso essencial de Hoje e tarefas.
- Tratar anúncios como hipótese de maior risco para a confiança, a privacidade e a sensação de calma do produto; não os colocar no MVP sem validação explícita.
- Definir custos operacionais, público, preço e limites do plano gratuito antes de prometer um plano pago.

## Prioridade 4 — distribuição

### 11. Publicar no Google Play — depois do beta móvel

- Criar conta Play Console, cadastro da loja, política de privacidade, declarações de dados e material visual.
- Gerar e assinar o Android App Bundle, testar em trilhas internas e fechadas e cumprir os requisitos vigentes da conta.
- Preparar conta ou modo de demonstração para revisão, além de fluxo de exclusão de conta quando exigido pelas políticas aplicáveis.
- Fazer o lançamento gradual e monitorar erros e feedback.
- A publicação e a descoberta orgânica não exigem compra de anúncios; considerar campanhas pagas só se os dados mostrarem que vale ampliar aquisição.
- Acompanhar no Play Console visitas à página da loja e instalações por busca, exploração, anúncios e indicações, e comparar com ativação e retenção medidas no produto.

### 12. Considerar iOS — etapa futura

- Retomar requisitos, autenticação Sign in with Apple, testes TestFlight e publicação na App Store quando o app móvel e o modelo de negócio estiverem validados.

## Ideias para depois — sem compromisso de MVP

Itens que o usuário já levantou, mantidos para avaliação futura:

### Feedback recente de teste — 20/11/2026

Uma usuária elogiou a interface e as cores e sugeriu melhorias para encaixar o Cuidam na rotina real. As quatro mudanças abaixo foram incorporadas à versão web; cenários com crianças seguem em validação de produto:

1. **Adicionar tarefa rapidamente — implementado.** O atalho fica no cabeçalho em qualquer tela autenticada e abre o formulário de Hoje.
2. **Encontrar tarefas por cômodo — implementado em Hoje.** As tarefas aparecem agrupadas por área por padrão; filtros rápidos na própria tela permitem focar em um cômodo sem adicionar outro destino à navegação.
3. **Tarefas pontuais com prazo — implementado.** Exigem uma data, aparecem em Hoje quando chega o prazo e permanecem vencidas até concluir ou arquivar. Não têm horário nem geram repetição.
4. **Passar responsabilidade — implementado na web.** A tarefa pessoal passa imediatamente para a outra pessoa; tarefas pendentes passam a refletir a nova responsabilidade. A atualização é vista ao abrir ou atualizar o Cuidam. Push fica para o app mobile; e-mail e SMS não são enviados.
5. **Rotina com filhos pequenos — validar com famílias.** Usar o exemplo de levar criança à creche em conversas de pesquisa; não criar modo infantil, perfis ou permissões adicionais ainda.

- Tema escuro.
- Casa visual/3D para decorar com itens ligados a recompensas resgatadas.
- Modo infantil, com tarefas e recompensas apropriadas (ex.: tempo de celular), exigindo estudo de privacidade e controles parentais.
- Idiomas inglês e espanhol.
- Mais de uma casa por conta e recursos premium relacionados, se a validação e o modelo de negócio justificarem.

## Decisões a revisitar

- O que os testes web mostram sobre frequência de uso, clareza das responsabilidades e recompensas.
- Quais benefícios justificariam pagamento e quais precisam continuar gratuitos.
- Qual provedor de e-mail hospedará o endereço corporativo.
- Quais capacidades móveis entram na primeira versão, além do que já existe na web.

