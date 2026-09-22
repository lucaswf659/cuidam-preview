"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type InviteInfo = { email: string; householdName: string; expiresAt: string };
type AuthMode = "signup" | "login";

const mockDemoInviteEmail = "morador.teste@cuidam.dev";
const mockDemoAreas = [
  { id: "kitchen", name: "Cozinha", icon: "🍳" },
  { id: "living", name: "Sala", icon: "🛋️" },
  { id: "bathroom", name: "Banheiro", icon: "🫧" },
  { id: "bedroom", name: "Quartos", icon: "🛏️" }
];

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isMock = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";
  const isMockDemo = isMock && token === "demo";
  const expiryLabel = useMemo(() => {
    if (!invite) return "";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(invite.expiresAt));
  }, [invite]);

  useEffect(() => {
    let active = true;
    params.then(({ token: routeToken }) => {
      if (!active) return;
      setToken(routeToken);
      if (isMock) {
        setLoading(false);
        return;
      }
      fetch(`/api/invite/${encodeURIComponent(routeToken)}`)
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar este convite.");
          return body.invitation as InviteInfo;
        })
        .then((invitation) => {
          if (!active) return;
          setInvite(invitation);
          setEmail(invitation.email);
        })
        .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Não foi possível carregar este convite."))
        .finally(() => active && setLoading(false));
    });
    return () => { active = false; };
  }, [isMock, params]);

  const acceptInvite = async (routeToken: string) => {
    const response = await fetch(`/api/invite/${encodeURIComponent(routeToken)}`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Não foi possível aceitar o convite.");
    setAccepted(true);
  };

  const acceptMockDemoInvite = async () => {
    setSubmitting(true);
    setError("");
    try {
      // O convite demo não passa pelo Supabase. Criamos a sessão mock do
      // morador convidado e uma casa de demonstração antes de liberar o
      // destino, para que /today não redirecione de volta à entrada.
      const authResponse = await fetch("/api/mock-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: mockDemoInviteEmail })
      });
      if (!authResponse.ok) throw new Error("Não foi possível iniciar a sessão de demonstração.");

      const householdResponse = await fetch("/api/onboarding");
      if (!householdResponse.ok) throw new Error("Não foi possível carregar a casa de demonstração.");
      const householdData = await householdResponse.json();
      if (!householdData.household) {
        const onboardingResponse = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Morador de teste", houseName: "Nossa casa de teste", areas: mockDemoAreas })
        });
        if (!onboardingResponse.ok) throw new Error("Não foi possível preparar a casa de demonstração.");
      }
      setAccepted(true);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Não foi possível aceitar o convite de teste.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isMock || !invite || !token || accepted) return;
    let active = true;
    createClient().auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      setSubmitting(true);
      return acceptInvite(token).catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível aceitar o convite.");
      }).finally(() => active && setSubmitting(false));
    });
    return () => { active = false; };
  }, [accepted, invite, isMock, token]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const auth = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/convite/${token}`)}`;
      const result = authMode === "signup"
        ? await auth.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() }, emailRedirectTo: redirectTo } })
        : await auth.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw new Error(result.error.message);
      if (!result.data.session) {
        setMessage("Confira seu e-mail para confirmar a conta. Depois, volte por este mesmo convite.");
        return;
      }
      await acceptInvite(token);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Não foi possível continuar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="invite-shell">
      <section className="invite-card" aria-live="polite">
        <div className="brand-lockup" aria-label="cuidam">
          <span className="brand-mark" aria-hidden="true">⌂</span>
          <span>cuidam</span>
        </div>

        {loading && <div className="invite-state"><p className="eyebrow">Um instante</p><h1>Carregando seu convite…</h1></div>}

        {!loading && isMock && !isMockDemo && (
          <div className="invite-state">
            <p className="eyebrow">Modo de demonstração</p>
            <h1>O convite real ainda não está ativo.</h1>
            <p className="lead">Ative o modo real e configure o Supabase para testar a entrada de uma segunda pessoa.</p>
            <button className="button primary" onClick={() => router.push("/")}>Voltar para o início</button>
          </div>
        )}

        {!loading && isMockDemo && !accepted && (
          <div className="invite-state">
            <p className="eyebrow">Convite de teste</p>
            <h1>Entre para cuidar da Nossa casa de teste.</h1>
            <p className="lead">Este link simula a experiência do convite usando dados mockados. Nenhuma conta ou banco real será alterado.</p>
            <div className="invite-summary"><span>Convite enviado para</span><strong>{mockDemoInviteEmail}</strong><small>Link local de demonstração</small></div>
            <button className="button primary" onClick={acceptMockDemoInvite} disabled={submitting}>{submitting ? "Preparando a casa…" : "Aceitar convite de teste"}</button>
            <button className="button text-button" onClick={() => router.push("/")}>Voltar para o início</button>
          </div>
        )}

        {!loading && !isMock && error && !invite && (
          <div className="invite-state">
            <p className="eyebrow">Convite indisponível</p>
            <h1>Não conseguimos abrir este convite.</h1>
            <p className="lead">{error}</p>
            <button className="button secondary" onClick={() => router.push("/")}>Voltar para o início</button>
          </div>
        )}

        {!loading && !isMock && invite && !accepted && (
          <>
            <div className="invite-state">
              <p className="eyebrow">Você foi convidado</p>
              <h1>Entre para cuidar da {invite.householdName}.</h1>
              <p className="lead">Você entra direto nessa casa, sem refazer o onboarding.</p>
              <div className="invite-summary"><span>Convite enviado para</span><strong>{invite.email}</strong><small>Válido até {expiryLabel}</small></div>
            </div>
            <form className="invite-form" onSubmit={submitAuth}>
              {authMode === "signup" && <label>Seu nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos te chamar?" autoComplete="name" required /></label>}
              <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
              <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} required /></label>
              <button className="button primary" type="submit" disabled={submitting}>{submitting ? "Entrando…" : authMode === "signup" ? "Criar conta e entrar" : "Entrar e aceitar convite"}</button>
              {message && <p className="form-success" role="status">{message}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
            <button className="button text-button invite-switch" type="button" onClick={() => { setAuthMode((current) => current === "signup" ? "login" : "signup"); setError(""); setMessage(""); }}>
              {authMode === "signup" ? "Já tenho uma conta" : "Ainda não tenho uma conta"}
            </button>
          </>
        )}

        {!loading && accepted && (isMockDemo || !isMock) && (
          <div className="invite-state">
            <div className="success-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">{isMockDemo ? "Demonstração concluída" : "Convite aceito"}</p>
            <h1>{isMockDemo ? "O fluxo funcionou." : "Agora vocês cuidam juntos."}</h1>
            <p className="lead">{isMockDemo ? "Os dados mockados representam a entrada de uma segunda pessoa." : `A casa ${invite?.householdName} já está disponível para você.`}</p>
            <button className="button primary" onClick={() => router.push("/today")}>Ir para Hoje</button>
          </div>
        )}
      </section>
    </main>
  );
}
