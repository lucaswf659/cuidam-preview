# Cuidam Android — plano técnico inicial

**Status:** fundação Android-first implementada; próxima etapa é concluir o onboarding nativo e validar os fluxos com tokens reais em ambiente isolado.

## Objetivo

Entregar um app Android nativo para o MVP do Cuidam, mantendo a mesma conta, casa e dados usados pela versão web. A estrutura deve permitir avaliar iOS depois sem manter dois clientes móveis separados.

## Stack proposta

- React Native com Expo e TypeScript.
- Expo Router para navegação e deep links.
- Supabase Auth para cadastro, login e sessão, com persistência nativa segura.
- Backend atual Next.js/Vercel + Prisma/PostgreSQL como única camada de regras de negócio e acesso aos dados.
- Supabase/PostgreSQL existentes; sem novo banco e sem duplicar modelos.
- Maestro para os fluxos móveis de ponta a ponta em emulador/dispositivo; manter Vitest e Playwright para domínio, API e regressão web.

Usar `npx expo install` para escolher versões compatíveis entre o Expo SDK ativo e módulos nativos, em vez de copiar versões arbitrárias para o projeto.

## Arquitetura e limites

O app móvel não acessará as tabelas de negócio diretamente pelo Data API do Supabase. A migration RLS atual habilita RLS sem políticas para `anon`/`authenticated`, de propósito. O app chamará as rotas do backend existentes, enviando `Authorization: Bearer <access_token>`.

O backend validará o token com Supabase Auth (`getUser(token)`), resolverá usuário, associação e casa ativa no Prisma e continuará verificando `householdId` em toda operação. O cliente web continuará usando sua sessão por cookies. Nenhuma `service_role` ou segredo de banco será incluído no binário móvel.

As regras de recorrência, conclusão, reivindicação de tarefas, estrelas, resgate, reativação de casa e autorização continuam no backend. Jobs de virada de período permanecem no servidor/scheduler; não dependem de o telefone estar aberto.

## Dados

Manter o domínio atual (`User`, `Household`, `Membership`, `Invitation`, `Area`, `Task`, `TaskOccurrence`, `OccurrenceCompletion`, `Reward`, `RewardRedemption`). A sessão nativa representa o mesmo `authProviderId` do Supabase. Não criar tabelas duplicadas para Android nem transformar cache offline em fonte da verdade.

## Autenticação e links

- Reutilizar Supabase Auth e as contas atuais com e-mail/senha.
- Guardar e renovar a sessão usando armazenamento seguro nativo; não persistir tokens em AsyncStorage nem em estado global durável inseguro.
- Preservar a confirmação manual do e-mail antes de consumir `TokenHash`, agora encaminhando a pessoa ao app quando instalado e mantendo uma alternativa web.
- Convites e recuperação de senha devem abrir o contexto certo por deep link e continuar seguros se o app não estiver instalado.
- Adiar login Google até a configuração OAuth e os retornos por deep link serem planejados e testados.

## Primeira entrega móvel

1. **Feito:** criar `apps/mobile` com Expo Router e configuração Android, ícone da marca, scheme de desenvolvimento e ambiente de API.
2. **Feito:** implementar sessão Supabase em SecureStore, cliente de API com Bearer, proteção de rotas e estados de sessão/rede.
3. **Feito:** adaptar as APIs atuais para aceitar cookie web ou Bearer móvel pelo mesmo validador de identidade, mantendo autorização por casa no servidor.
4. **Parcial:** cadastro/login, recuperação encaminhada pelo fluxo web e Hoje (consulta, assumir compartilhada e concluir). Contas sem casa continuam indo à configuração web.
5. Continuar com Nós, recompensas e configurações, preservando o escopo e a linguagem da `MVP-SPEC.md`.
6. Preparar convites e links de autenticação em Android App Links para o domínio final; continuar cobrindo o fallback web.
7. Retomar notificações push somente quando os fluxos principais estiverem estáveis e a política de lembretes do MVP for aplicada.

## Validação

- Unitários para sessão, parsing/erros da API e regras de apresentação compartilháveis.
- Testes de API para token válido/inválido, isolamento entre casas e operações críticas.
- E2E de backend sempre no projeto Supabase/Postgres isolado documentado em `E2E-TESTS.md`.
- Smoke/E2E em Android: cadastro/login, recuperar acesso, consultar Hoje, assumir/concluir uma tarefa compartilhada, convite, saldo/resgate e logout.
- Verificar link externo em outro dispositivo, perda de rede, renovação de sessão, retomada após suspensão e acessibilidade/touch targets.
- Antes do Google Play: build assinado AAB, trilha interna, política de privacidade e declarações de dados; nenhuma publicação antes de validar os fluxos essenciais.

Checagem inicial concluída: `npm run typecheck` em `apps/mobile`, `npm run lint` na web, 7 testes unitários/API de Bearer e tarefas, e `npx expo export --platform android` com as variáveis públicas do preview configuradas concluíram com sucesso. Isso valida tipos e bundle JS; ainda falta executar em um emulador/aparelho e validar a API com sessão real do projeto de teste isolado.

## Riscos e dependências

- A autenticação de API por Bearer é uma mudança de segurança compartilhada pela web e pelo app; precisa manter o comportamento de cookie e receber testes de isolamento antes de ativar o cliente móvel.
- Deep links de e-mail são parte do fluxo de cadastro/recuperação, não um detalhe visual. Precisam de domínio, associação Android App Links e fallback web validados.
- A app store é uma etapa posterior. Primeiro instalar builds de desenvolvimento e validar com uma casa real de teste.
