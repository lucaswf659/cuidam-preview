# Cuidam Android

Cliente móvel Android-first em Expo/React Native. O primeiro recorte inclui cadastro/login, recuperação de acesso, Hoje, assumir tarefa compartilhada, concluir e sair da conta.

O app usa o mesmo Supabase Auth e backend Next.js/Vercel da web. Ele não acessa o Postgres diretamente: manda o token da sessão em `Authorization: Bearer ...` para as APIs, que continuam aplicando autorização por casa.

## Preparar o ambiente

1. Copie `.env.example` para `.env.local`.
2. Preencha a URL e a chave pública do Supabase **do mesmo ambiente** definido em `EXPO_PUBLIC_CUIDAM_API_URL`.
3. Use chaves publicáveis/anon no app. Nunca coloque `service_role`, secret key ou senha do banco em variáveis `EXPO_PUBLIC_*`.
4. Rode `npm install` dentro de `apps/mobile`.
5. Rode `npx expo start --android` com o emulador Android aberto. Também é possível abrir o projeto no Expo Go para explorar o fluxo de desenvolvimento.

Para usar o backend local pelo emulador Android, deixe o Next ativo na porta 3000 e use `http://10.0.2.2:3000`; `localhost` dentro do emulador aponta para o próprio emulador. Para testar contra o preview, use a URL e as credenciais públicas do projeto Supabase de preview.

## Fluxos incluídos e limites desta primeira entrega

- Login/cadastro usam Supabase Auth e persistem a sessão via `expo-secure-store`.
- A confirmação de cadastro e a troca de senha ainda abrem o fluxo web atual. Deep links verificados do domínio Cuidam serão a próxima etapa.
- Contas que ainda não têm casa são direcionadas à configuração inicial na web. O onboarding nativo e as demais telas (Nós, recompensas e Configurações) entram nas próximas etapas.
- Notificações push ficam para depois dos fluxos principais.
- `br.app.cuidam` é o identificador Android configurado para desenvolvimento; confirmar definitivamente antes do primeiro cadastro/publicação no Google Play.

## Próximos marcos

1. Validar o fluxo Bearer e o isolamento por casa em testes de API.
2. Criar o onboarding nativo com a mesma lista de sugestões do MVP.
3. Implementar Nós, recompensas e Configurações.
4. Implementar Android App Links para confirmação, recuperação e convite, preservando fallback web.
5. Testar no emulador e aparelho; preparar a trilha interna do Google Play somente depois da validação.
