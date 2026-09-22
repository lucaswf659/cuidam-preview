# Fluxo de trabalho com agentes — Cuidam

## Coordenação

O agente coordenador é responsável por entender o pedido, verificar as fontes de verdade, dividir o trabalho quando necessário, integrar os resultados e tomar a decisão final.

Nenhuma recomendação de um agente substitui a especificação do produto, a marca, o domínio ou os critérios de aceite.

## Quando usar cada formato

### Tarefa pequena

Usar um único agente com revisão interna.

Exemplos:

- ajuste visual localizado;
- correção de bug;
- mudança pequena de texto;
- teste unitário específico.

### Feature grande

Dividir em quatro frentes:

1. Product: objetivo, escopo, regras e critérios de aceite.
2. UX/UI: fluxo, hierarquia, responsividade e acessibilidade.
3. Frontend: componentes, estados e integração visual.
4. QA: cenários, regressão e casos extremos.

O coordenador integra as frentes e resolve conflitos antes de considerar a feature concluída.

### Pesquisa independente

Usar dois ou três agentes em paralelo quando as perguntas forem independentes. Cada agente deve receber uma pergunta clara, escopo delimitado e formato de saída esperado.

## Regras de integração

- Evitar que dois agentes editem os mesmos arquivos simultaneamente.
- Toda alteração deve respeitar `AGENTS.md` e os arquivos de source of truth.
- Toda feature precisa terminar com validação proporcional ao risco.
- QA pode bloquear a conclusão quando encontrar regressão funcional, visual ou de produto.
- O coordenador sempre apresenta ao usuário o resultado consolidado, os riscos e o próximo passo.

## Formato de delegação

```text
Papel:
Objetivo:
Contexto:
Arquivos em escopo:
Fora de escopo:
Critérios de aceite:
Resultado esperado:
``` 

## Política atual do Cuidam

- Tarefas pequenas: agente coordenador com revisão interna.
- Features grandes: Product + UX/UI + Frontend + QA.
- Pesquisa independente: dois ou três agentes em paralelo.
- Decisão final: sempre do agente coordenador, respeitando a especificação do produto.
