# E-mails de autenticação do Cuidam

O Cuidam envia e-mails transacionais de confirmação de conta e recuperação de senha pelo Supabase Auth usando o SMTP do Resend. A confirmação do link acontece numa página do Cuidam antes de consumir o token, evitando que a prévia automática de alguns provedores invalide o link.

## Configuração do projeto

Em **Authentication → URL Configuration**:

- Defina **Site URL** como a URL principal do deployment (no preview: `https://cuidam-preview.vercel.app`).
- Em **Redirect URLs**, permita `https://cuidam-preview.vercel.app/entrar` e `https://cuidam-preview.vercel.app/convite/**`. Para produção, adicione os equivalentes no domínio final. Para desenvolvimento local, permita `http://localhost:3000/**`.
- O `emailRedirectTo` usado no cadastro precisa corresponder à allow list do Supabase; não use curingas amplos em produção.

Em **Authentication → SMTP Settings**, use as credenciais SMTP do Resend no projeto Supabase que serve o deployment. O projeto E2E deve manter credenciais próprias de teste.

Em **Authentication → Email Templates**, personalize estes dois templates:

### Confirm signup

**Subject:** `Confirme seu e-mail para entrar no Cuidam`

```html
<h2>Confirme seu e-mail</h2>
<p>Recebemos seu pedido para criar uma conta no Cuidam.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">Confirmar e continuar</a></p>
<p>Depois da confirmação, você volta ao Cuidam para configurar sua casa ou continuar pelo convite recebido.</p>
<p>Se você não pediu esta conta, pode ignorar esta mensagem.</p>
```

### Reset Password

**Subject:** `Vamos recuperar seu acesso ao Cuidam`

```html
<h2>Vamos recuperar seu acesso</h2>
<p>Recebemos um pedido para trocar a senha da sua conta no Cuidam.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Escolher nova senha</a></p>
<p>Se você não pediu essa troca, ignore esta mensagem; sua senha continua a mesma.</p>
```

Os templates padrão podem incluir o link do Supabase e textos em inglês. Salve as alterações no projeto Supabase de preview/produção que realmente envia os e-mails. Links já enviados antes de salvar continuarão com o template antigo.

O app não envia e-mail de convite: ele cria um link compartilhável. Para o cadastro iniciado por esse link, o template **Confirm signup** reaproveita `{{ .RedirectTo }}` e retorna a pessoa ao convite após confirmar o e-mail.

## Fluxos

### Cadastro

1. `signUp` envia o template de confirmação. Como o Supabase exige confirmação, a tela muda para entrar e avisa qual endereço recebeu o link.
2. O link abre `/auth/confirm`. A tela exige um clique para evitar que verificadores automáticos consumam o token.
3. `/api/auth/confirm-signup` valida o hash com `verifyOtp` e cria a sessão no navegador que abriu o link.
4. A pessoa volta a `/entrar` para configurar a casa, ou ao convite original para aceitá-lo.

### Recuperação de senha

1. `resetPasswordForEmail` pede ao Supabase uma mensagem de recuperação.
2. O link personalizado abre `/auth/confirm` com o tipo `recovery`.
3. `/api/auth/confirm-recovery` valida o token com `verifyOtp` e cria a sessão no navegador atual.
4. `/auth/reset-password` permite definir a nova senha.

Os links com TokenHash podem ser abertos em outro navegador ou dispositivo. Se a URL usada pelo projeto mudar, atualize `Site URL` e os Redirect URLs permitidos.

## Entrega e spam

- No Resend, abra o e-mail enviado e consulte **Insights** para ver problemas de conteúdo, domínio ou links.
- Desative open tracking e click tracking para esses e-mails transacionais; o tracking pode reescrever links de uso único.
- Mantenha o DNS de autenticação validado e configure DMARC em modo de monitoramento (`p=none`) no provedor DNS antes de adotar políticas mais restritivas.
- Como o domínio de envio é novo, a reputação ainda está sendo construída. Envie apenas mensagens esperadas, evite vários reenvios seguidos e peça aos testadores para marcar o e-mail como “Não é spam” quando necessário.
- Confirmação e recuperação não são mensagens de marketing. Não coloque anúncios ou conteúdo promocional nelas.
