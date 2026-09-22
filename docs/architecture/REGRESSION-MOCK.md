# Regressão funcional — MVP mock

Data da execução: 21/09/2026

## Escopo

Regressão do fluxo principal mockado, sem banco externo:

`entrada → sessão → casa → áreas/tarefas sugeridas → Hoje → Nós → Casa`

## Cenários executados

| ID | Cenário | Resultado |
| --- | --- | --- |
| R-01 | Abrir a entrada e iniciar cadastro | Passou — tela inicial e formulário são exibidos. |
| R-02 | Validar payload de onboarding incompleto | Passou — payload inválido retorna erro de validação. |
| R-03 | Criar sessão mock com e-mail | Passou — cookie `cuidam_mock_session` é criado no path `/`. |
| R-04 | Criar casa com áreas selecionadas | Passou — casa, áreas e sugestões de tarefas são criadas. |
| R-05 | Selecionar todas as áreas | Passou — cada área selecionada recebe suas tarefas sugeridas. |
| R-06 | Acessar `/today` com sessão válida | Passou — tarefas pendentes e progresso são exibidos. |
| R-07 | Concluir tarefa em Hoje | Passou — tarefa fica concluída e deixa de aparecer como pendente. |
| R-08 | Acessar `/nos` e abrir uma área | Passou — equilíbrio e tarefas da área são exibidos. |
| R-09 | Acessar `/casa` | Passou — nome, responsável, áreas e convite são exibidos. |
| R-10 | Registrar convite mock | Passou — convite é aceito pela API e feedback aparece na tela. |
| R-11 | Editar tarefa pela API mock | Passou — nome, área, responsabilidade, recorrência e carga são atualizados. |
| R-12 | Remover tarefa da rotina pela API mock | Passou — tarefa é arquivada sem apagar o registro. |
| R-13 | Ignorar tarefas arquivadas no equilíbrio | Passou — tarefas arquivadas não entram no cálculo ativo de Nós. |
| R-14 | Rodar testes automatizados | Passou — 4 testes em 2 arquivos. |
| R-15 | Rodar typecheck/lint | Passou — `tsc --noEmit`. |
| R-16 | Gerar build de produção | Passou — build concluído com 11 rotas. |

## Comandos usados

```bash
npm test
npm run lint
npm run build
```

## Observações

- O armazenamento ainda é em memória no servidor; reiniciar o processo limpa as casas mockadas.
- A edição e o arquivamento já possuem contrato na API mock. A próxima validação visual deve cobrir o formulário de edição e a confirmação de remoção quando essa interface for conectada.
- Não foi validada integração Supabase/PostgreSQL nesta rodada, pois o escopo atual permanece mock-first.

## Rodada adversarial — 21/09/2026

Também foram executados requests diretos contra o servidor local para tentar quebrar os contratos:

| Tentativa | Resultado |
| --- | --- |
| Onboarding, convite e tarefas sem cookie de sessão | Rejeitados com `401`. |
| Login sem e-mail | Rejeitado com `400`. |
| Tarefa com carga 99 | Rejeitada com `400`. |
| Tarefa com recorrência desconhecida | Rejeitada com `400`. |
| Tarefa em área inexistente | Inicialmente aceita; corrigida durante a regressão para rejeitar com `400`. |
| Atualização de tarefa inexistente | Rejeitada com `404`. |
| Convite com e-mail inválido | Rejeitado com `400`. |
| Tarefa válida após as tentativas inválidas | Aceita com `201`; as falhas anteriores não impediram o fluxo. |

Essa rodada encontrou e corrigiu a ausência de autorização de área no endpoint de tarefas: agora `areaId` precisa pertencer à casa associada à sessão.
