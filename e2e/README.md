# Teste E2E com cenário grande

O arquivo [`fixtures/large-household.json`](./fixtures/large-household.json) define uma casa sintética com seis áreas, 36 tarefas, dois membros, estados variados e quatro recompensas.

## Executar

1. Configure `.env.e2e` para apontar a um projeto Supabase/Postgres exclusivo para testes. O arquivo não deve apontar para o projeto de produção.
2. Se o schema do projeto E2E ainda não estiver migrado, rode `npm run db:migrate:deploy:e2e`.
3. Execute `npm run test:e2e:volume`.

O Playwright cria contas de teste, passa pelo onboarding, carrega o fixture grande e navega por Hoje, Nós, Configurações e Recompensas. A jornada em `specs/mobile-journey.spec.ts` usa viewport de 390 × 844 com toque para validar filtro por cômodo, áreas de toque, navegação, conclusão de tarefa e ausência de overflow horizontal. Os demais cenários cobrem convite, saída/reativação, autorização, concorrência, recompensas e recorrência. O `globalTeardown` remove as contas e casas com prefixo E2E depois da execução.

O teste mede a mediana de três navegações aquecidas: TTFB/HTML do servidor local e tempo até a interface ficar pronta. Também mede o tempo da API e a resposta visual de “Vou cuidar” e “Concluir”. É uma referência para regressões no código e no banco E2E; não é uma medição da Vercel de produção nem uma meta de performance.
