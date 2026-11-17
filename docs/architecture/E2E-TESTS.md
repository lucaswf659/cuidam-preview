# Executar os testes end to end

Os testes E2E usam Playwright, Supabase Auth e PostgreSQL reais. Eles criam casas e contas descartáveis, então precisam de um projeto Supabase/PostgreSQL exclusivo para testes. O runner recusa a configuração se detectar que as credenciais coincidem com `.env`, `.env.local` ou com variáveis de ambiente já configuradas.

## Preparar o projeto isolado

1. Crie um projeto Supabase separado do preview/produção. Não reutilize a URL, a senha ou as chaves do projeto da aplicação.
2. No Supabase Auth desse projeto de teste, desative a confirmação de e-mail. Isso permite testar cadastro sem SMTP. Faça essa mudança somente no projeto isolado.
3. Copie `.env.e2e.example` para `.env.e2e` e obtenha os valores neste projeto:
   - `CUIDAM_E2E_SUPABASE_PROJECT_REF`: trecho antes de `.supabase.co` na Project URL.
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: botão **Connect** no topo do projeto, ou **Project Settings → API Keys**.
   - `SUPABASE_SECRET_KEY`: **Project Settings → API Keys → Secret key**. Fica só no arquivo local; nunca envie essa chave por chat ou para o navegador.
   - Senha do banco: a que foi definida ao criar o projeto. Se não a tiver, redefina em **Project Settings → Database**.
   - `DATABASE_URL`: **Connect → Transaction pooler** (porta `6543`); preserve `?pgbouncer=true` e substitua o marcador de senha.
   - `DIRECT_URL`: **Connect → Direct connection** (porta `5432`). Se sua rede não alcançar o host direto, use **Session pooler** (também porta `5432`). Copie host e usuário exatamente como apresentados e substitua o marcador de senha.
   - `CUIDAM_E2E_CONFIRM_ISOLATED_PROJECT` e `CUIDAM_E2E_EMAIL_PREFIX`: mantenha os valores do exemplo.

   `.env.e2e` é ignorado pelo Git. Senhas com caracteres especiais precisam estar codificadas para URL na connection string.
4. Rode `npm run db:migrate:deploy:e2e`. O comando lê `.env.e2e`, aplica as migrações só nesse banco e não passa a chave service role ao Prisma.
5. Confira que `CUIDAM_E2E_SUPABASE_PROJECT_REF` identifica esse mesmo projeto e mantenha `CUIDAM_E2E_CONFIRM_ISOLATED_PROJECT=YES_CUIDAM_E2E_ONLY`.
6. Instale o navegador uma vez com `npx playwright install chromium`.

A Secret key é usada somente pelo teardown para apagar as contas com o prefixo `CUIDAM_E2E_EMAIL_PREFIX` e as casas `E2E ...` criadas por elas. Ela não é passada ao servidor Next nem ao navegador. O prefixo deve ser exclusivo deste projeto descartável.

## Executar

```bash
npm run test:coverage
npm run test:e2e
npm run test:e2e:report
```

A suíte percorre cadastro/login e retomada da casa, criação/conclusão de tarefas, convite e entrada da segunda conta, disputa concorrente pela reserva, isolamento entre duas casas, resgate idempotente, virada de recorrência e bloqueio de leitura anônima pela Supabase Data API. Trace, vídeo e captura de tela são guardados em `test-results/` em caso de falha; o relatório HTML fica em `playwright-report/`.

Não execute os E2E contra o banco de preview ou produção. O runner mantém a execução bloqueada até encontrar `.env.e2e` válida e diferente da configuração normal.

