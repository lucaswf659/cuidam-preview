# Recuperação de senha do Cuidam

O app usa o template padrão de recuperação do Supabase. Não é necessário editar o HTML do e-mail nem configurar SMTP próprio para testar esse fluxo.

## Configuração no Supabase

Em **Authentication → URL Configuration**:

- Defina **Site URL** como `https://cuidam-preview.vercel.app`.
- Em **Redirect URLs**, permita `https://cuidam-preview.vercel.app/**`.
- Para desenvolvimento local, permita também `http://localhost:3000/**`.
- Em **Authentication → Email Templates → Reset Password**, mantenha o link padrão `{{ .ConfirmationURL }}`.

O domínio usado pelo app precisa estar na lista de Redirect URLs. Se a URL de implantação mudar, adicione o novo domínio ali. Solicitações de recuperação já enviadas podem carregar links antigos; peça uma nova mensagem depois de qualquer ajuste.

## Fluxo

1. `resetPasswordForEmail` pede ao Supabase um e-mail e aponta o retorno para `/auth/callback?next=/auth/reset-password`.
2. O template padrão leva a pessoa ao Supabase, que valida o link e redireciona de volta com um código PKCE.
3. `/auth/callback` troca o código por uma sessão e grava os cookies usando o cliente Supabase do servidor.
4. `/auth/reset-password` exige essa sessão e permite definir a nova senha.

O código PKCE é mantido no navegador que iniciou a solicitação. Por isso, abra o link no mesmo navegador/perfil em que pediu a recuperação. Se o código estiver ausente, expirado ou já tiver sido usado, o app explica como continuar o processo.