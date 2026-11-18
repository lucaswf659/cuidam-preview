# Cuidam — prioridades e próximos passos

Este documento mantém o plano de evolução do produto. A especificação de escopo e comportamento do MVP continua em [`MVP-SPEC.md`](./MVP-SPEC.md). Itens de ideias futuras não são compromisso de implementação até serem priorizados.

## Direção acordada

1. Refinar e validar a versão web com as pessoas que já estão testando.
2. Preparar autenticação, e-mails e infraestrutura para um piloto mais amplo.
3. Depois da validação web, planejar o app móvel em React Native/Expo, compartilhando o backend e o Supabase.
4. Definir um modelo de negócio sustentável sem prejudicar a experiência acolhedora do Cuidam.
5. Publicar primeiro no Google Play; avaliar publicação iOS na etapa móvel, sem iniciar agora o trabalho específico da App Store.

## Prioridade 0 — versão web utilizável e validada

### 1. Continuar o refinamento do MVP web — em andamento

- Recolher feedback dos amigos que estão testando e corrigir os bloqueios de uso observados.
- Revisar os fluxos principais em celular: criar conta, configurar a casa, criar e concluir tarefas, convidar alguém, sair/reativar casa e resgatar recompensa.
- Manter a hierarquia visual, textos e navegação simples; evitar configuração obrigatória e linguagem de cobrança.
- Verificar o comportamento com casas de uma e duas pessoas.

### 2. Usar a baseline de tarefas e recompensas — implementado, validar com uso

- Tarefas sugeridas começam com esforço estimado e tarefas manuais usam o padrão definido no MVP.
- Cada ocorrência concluída rende estrelas conforme esforço e meta de conclusões; metas de várias vezes por semana só creditam o total quando completas.
- Casas novas começam com sugestões de recompensa; casas sem recompensas podem adicioná-las e editar os valores.
- Observar se os valores iniciais fazem sentido para rotinas diferentes. Ajustar presets com evidência dos testes, sem apresentar estrelas como dinheiro ou competição.

## Prioridade 1 — preparar o piloto e a operação

### 3. Entrar com Google — a fazer

- Configurar o cliente OAuth no Google Cloud e o provedor Google no Supabase.
- Cadastrar os redirects de desenvolvimento, preview e produção.
- Adicionar o fluxo de login Google na web, mantendo e-mail e senha como alternativa.
- Testar cadastro, login de uma conta existente, callback em outro dispositivo e comportamento para e-mail já cadastrado antes de liberar para todos.

### 4. Personalizar e revisar os e-mails — a fazer

- Criar templates de confirmação e recuperação de senha com identidade do Cuidam, texto claro, remetente reconhecível e links corretos.
- Revisar visualização em celular, texto puro, validade e destino dos links.
- Acompanhar entregabilidade e spam depois de atualizar os templates; Resend e o domínio de envio já foram configurados e um envio de teste chegou.
- Não afirmar que convites são enviados por e-mail enquanto o fluxo continuar gerando apenas um link para compartilhar.

### 5. Criar um contato corporativo — a fazer

- Definir provedor e endereço público de contato no domínio Cuidam, por exemplo `contato@cuidam.app.br`.
- Configurar caixa de entrada, recuperação de acesso e assinatura da marca.
- Usar esse endereço nos dados de suporte, política de privacidade e cadastro das lojas quando fizer sentido.

### 6. Revisar infraestrutura, segurança e operação — a fazer antes de ampliar o piloto

- Confirmar quais projetos Supabase são de desenvolvimento, E2E, preview e produção; conferir variáveis de ambiente e URLs autorizadas em cada um.
- Verificar que a migration de RLS está aplicada no projeto real e testar que dados de uma casa não podem ser lidos por outra.
- Revisar privilégios de chaves, backups e recuperação, limites de autenticação, logs, alertas e processo de resposta a incidentes.
- Rever política de privacidade, retenção e exclusão de conta/dados antes de abrir cadastro para mais pessoas.
- Manter testes E2E apontados somente ao projeto isolado.

### 7. Mapear a jornada e a navegação dos usuários — prioridade para o piloto

- Entender de onde as pessoas chegam (convite, landing page, busca orgânica, indicação ou anúncio) e em quais etapas avançam ou desistem.
- Acompanhar o caminho até o primeiro valor: abrir o app, concluir cadastro, criar/entrar em uma casa, criar e concluir a primeira tarefa, convidar/receber a segunda pessoa e voltar a usar a casa.
- Usar os eventos de produto definidos no MVP, como `onboarding_completed`, `first_task_created`, `first_task_completed`, `invitation_accepted` e `household_active_week`; confirmar a lista completa na instrumentação antes de lançar.
- Avaliar ativação e retenção por casa, além de usuários individuais, para saber se a divisão doméstica está funcionando para o grupo.
- Medir origem, conversão e pontos de abandono com dados agregados. Não registrar e-mails, nomes de tarefas ou outros conteúdos privados em ferramentas de analytics; avaliar consentimento, retenção e política de privacidade antes de ativar coleta.

## Prioridade 2 — validar valor e modelo de negócio

### 8. Pesquisar monetização — explorar, sem decisão tomada

- Comparar freemium e anúncios com conversas e testes com usuários; não implementar nenhum modelo até entender o valor que as pessoas usam e pelo que pagariam.
- Investigar primeiro benefícios premium compatíveis com a proposta, como recursos adicionais para casas, sem limitar o uso essencial de Hoje e tarefas.
- Tratar anúncios como hipótese de maior risco para a confiança, a privacidade e a sensação de calma do produto; não os colocar no MVP sem validação explícita.
- Definir custos operacionais, público, preço e limites do plano gratuito antes de prometer um plano pago.

## Prioridade 3 — app móvel e publicação

### 9. Planejar o app React Native/Expo — depois da validação web

- Reaproveitar Supabase, regras de negócio e APIs sempre que adequado; redesenhar os fluxos e componentes para uso nativo em iOS e Android.
- Definir navegação, sessão segura, links profundos para convites e recuperação, estados offline/rede e processo de atualização.
- Retomar notificações push nesta etapa, conforme o MVP; elas permanecem fora do produto web.
- Implementar autenticação Google nativa com retorno por deep link.

### 10. Publicar no Google Play — depois do beta móvel

- Criar conta Play Console, cadastro da loja, política de privacidade, declarações de dados e material visual.
- Gerar e assinar o Android App Bundle, testar em trilhas internas e fechadas e cumprir os requisitos vigentes da conta.
- Preparar conta ou modo de demonstração para revisão, além de fluxo de exclusão de conta quando exigido pelas políticas aplicáveis.
- Fazer o lançamento gradual e monitorar erros e feedback.
- A publicação e a descoberta orgânica não exigem compra de anúncios; considerar campanhas pagas só se os dados mostrarem que vale ampliar aquisição.
- Acompanhar no Play Console visitas à página da loja e instalações por busca, exploração, anúncios e indicações, e comparar com ativação e retenção medidas no produto.

### 11. Considerar iOS — etapa futura

- Retomar requisitos, autenticação Sign in with Apple, testes TestFlight e publicação na App Store quando o app móvel e o modelo de negócio estiverem validados.

## Ideias para depois — sem compromisso de MVP

Itens que o usuário já levantou, mantidos para avaliação futura:

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
