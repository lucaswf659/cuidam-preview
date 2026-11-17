# Recuperação de senha do Cuidam

Os links novos usam `TokenHash` e são confirmados no servidor do Cuidam. Isso permite abrir o link em outro navegador ou dispositivo e evita que uma prévia automática do e-mail consuma o token.

## Configuração no Supabase

Em **Authentication → URL Configuration**:

- Defina **Site URL** como a URL do deployment correspondente (no preview, `https://cuidam-preview.vercel.app`).
- Em **Redirect URLs**, mantenha as URLs de deployment e, para desenvolvimento local, `http://localhost:3000/**`.

Em **Authentication → Email Templates → Reset Password**, substitua o link `{{ .ConfirmationURL }}` por um link personalizado com `{{ .TokenHash }}`. Exemplo de conteúdo:

```html
<h2>Redefinir senha</h2>
<p>Recebemos um pedido para redefinir sua senha. Use o link abaixo para escolher uma nova.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Redefinir senha</a></p>
<p>Se você não pediu a redefinição, ignore este e-mail.</p>
```

Se a URL usada pelo projeto mudar, atualize `Site URL` e os Redirect URLs permitidos. Links de recuperação enviados antes da troca do template continuam usando o fluxo antigo; peça uma nova mensagem após salvar o template.

## Fluxo

1. `resetPasswordForEmail` pede ao Supabase uma mensagem de recuperação.
2. O link personalizado abre `/auth/confirm` com o hash e o tipo `recovery`.
3. A pessoa confirma explicitamente o link; `/api/auth/confirm-recovery` valida o token com `verifyOtp` e grava a sessão no navegador atual.
4. `/auth/reset-password` exige essa sessão e permite definir a nova senha.

Como o link contém o token de uso único, pode ser aberto em outro navegador ou dispositivo. A confirmação explícita também evita que verificadores automáticos de e-mail consumam o token ao pré-visualizar a mensagem.
