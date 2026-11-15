# Configuração de e-mail de recuperação do Cuidam

O Cuidam confirma o TokenHash no servidor para não depender de o link ser aberto no mesmo navegador que pediu a recuperação. A página de confirmação exige um clique antes de validar o token, evitando que pré-visualizações automáticas de e-mail o consumam. Se o template padrão do Supabase ainda estiver ativo, o callback PKCE também aceita o fluxo no mesmo navegador. Para abrir o link em outro navegador, configure o template TokenHash abaixo.

## Configurar o template no Supabase

No painel do projeto Supabase, abra **Authentication → Email Templates → Reset Password** e ajuste o assunto e o corpo:

**Assunto**

```text
Redefina sua senha do Cuidam
```

**Corpo HTML**

```html
<h2>Vamos recuperar seu acesso ao Cuidam</h2>
<p>Recebemos um pedido para redefinir a senha da sua conta.</p>
<p>Para continuar, confirme o pedido pelo botão abaixo:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Continuar para redefinir senha</a></p>
<p>Se você não pediu essa alteração, ignore esta mensagem. Sua senha não será alterada.</p>
```

Em **Authentication → URL Configuration**, confira se **Site URL** é `https://cuidam-preview.vercel.app`. O link usa `.SiteURL` para retornar ao app. Depois de salvar o template, peça um novo e-mail de recuperação; mensagens anteriores continuam com o link antigo.

## Fluxo no app

1. `resetPasswordForEmail` solicita o e-mail. A resposta visual é neutra para não revelar se a conta existe.
2. O link abre `/auth/confirm` com o TokenHash, sem consumi-lo ao carregar a página.
3. Ao tocar em “Continuar para trocar a senha”, o app envia o TokenHash por POST para `/api/auth/confirm-recovery`; o backend valida `type: recovery` com `verifyOtp` e grava a sessão Supabase em cookies.
4. A pessoa define a nova senha em `/auth/reset-password`.

