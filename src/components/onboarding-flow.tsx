"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type Step = "welcome" | "signup" | "house" | "presets" | "invite" | "done";
type AuthMode = "signup" | "login";

function CuidamMark({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "cuidam-mark-svg compact" : "cuidam-mark-svg"} viewBox="0 0 48 48" role="img" aria-label="Casa com folha">
    <path d="M11 23.5 24 11l13 12.5v14H11Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M29.2 35.8c.1-5.1 2.8-7.7 7.6-7.9.2 4.7-2.4 7.6-7.6 7.9Z" fill="#68bb7f" stroke="#68bb7f" strokeWidth="1" strokeLinejoin="round" />
    <path d="M30.2 34.8c1.5-1.2 2.9-2.5 4.2-4" fill="none" stroke="#dcefe0" strokeWidth="1" strokeLinecap="round" />
  </svg>;
}

const suggestedAreas = [
  { id: "kitchen", icon: "🍳", name: "Cozinha", selected: true },
  { id: "living", icon: "🛋️", name: "Sala", selected: true },
  { id: "bathroom", icon: "🫧", name: "Banheiro", selected: true },
  { id: "bedroom", icon: "🛏️", name: "Quartos", selected: true },
  { id: "office", icon: "💻", name: "Escritório", selected: false },
  { id: "pets", icon: "🐾", name: "Pets", selected: false }
];

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [houseName, setHouseName] = useState("Nossa casa");
  const [error, setError] = useState("");
  const [selectedAreas, setSelectedAreas] = useState(() =>
    new Set(suggestedAreas.filter((area) => area.selected).map((area) => area.id))
  );
  const router = useRouter();
  const inviteEndpoint = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/invite" : "/api/mock/invite";

  const continueSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false") {
      const response = await fetch("/api/mock-auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      if (!response.ok) { setError("Informe um e-mail válido."); return; }
      if (authMode === "login") {
        const householdResponse = await fetch("/api/onboarding");
        const householdData = await householdResponse.json();
        if (householdData.household) { setHouseName(householdData.household.name); setStep("done"); return; }
      }
      setStep("house");
      return;
    }
    const auth = createClient();
    const result = authMode === "signup"
      ? await auth.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/auth/callback` } })
      : await auth.auth.signInWithPassword({ email, password });
    if (result.error) { setError(result.error.message); return; }
    if (!result.data.session) {
      setError("Confira seu e-mail para confirmar a conta antes de continuar.");
      return;
    }
    if (authMode === "login") {
      const householdResponse = await fetch("/api/onboarding");
      if (!householdResponse.ok) { setError("Não foi possível recuperar sua casa."); return; }
      const householdData = await householdResponse.json();
      if (householdData.household) {
        setHouseName(householdData.household.name);
        setStep("done");
        return;
      }
    }
    setStep("house");
  };

  const finishOnboarding = async () => {
    setError("");
    const onboardingName = name.trim() || email.trim().split("@")[0] || "Você";
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: onboardingName, houseName, areas: suggestedAreas.filter((area) => selectedAreas.has(area.id)) }) });
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? "Não foi possível salvar sua casa."); return; }
    setStep("invite");
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) { setStep("done"); return; }
    const response = await fetch(inviteEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    if (!response.ok) { setError("Informe um e-mail válido."); return; }
    setStep("done");
  };

  const greeting = name.trim() ? name.trim().split(" ")[0] : "você";

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card" aria-live="polite">
        <div className="brand-lockup" aria-label="cuidam">
          <span className="brand-mark" aria-hidden="true"><CuidamMark compact /></span>
          <span>cuidam</span>
        </div>

        {step === "welcome" && (
          <div className="welcome-step step-content">
            <div className="organic-shape" aria-hidden="true"><CuidamMark /></div>
            <p className="eyebrow">Uma casa mais leve</p>
            <h1>Cada um cuida do que é seu.</h1>
            <p className="lead">Organizem as responsabilidades da casa sem precisar lembrar ou cobrar um ao outro.</p>
            <div className="actions stacked-actions">
              <button className="button primary" onClick={() => { setAuthMode("signup"); setStep("signup"); }}>Criar conta</button>
              <button className="button secondary" onClick={() => { setAuthMode("login"); setStep("signup"); }}>Já tenho uma conta</button>
            </div>
            <p className="microcopy">Comece sozinho. Convide alguém quando fizer sentido.</p>
          </div>
        )}

        {step === "signup" && (
          <form className="step-content form-step" onSubmit={continueSignup}>
            <button className="back" type="button" onClick={() => setStep("welcome")}>← Voltar</button>
            <p className="eyebrow">{authMode === "signup" ? "Começando" : "De volta à casa"}</p>
            <h1>{authMode === "signup" ? "Vamos deixar isso fácil." : "Que bom ter você de volta."}</h1>
            <p className="lead">{authMode === "signup" ? "Crie sua conta. Você configura a casa em seguida." : "Entre para continuar de onde parou."}</p>
            {authMode === "signup" && <label>Seu nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos te chamar?" autoComplete="name" required /></label>}
            <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" autoComplete="email" required /></label>
            <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" autoComplete="new-password" minLength={8} required /></label>
            <button className="button primary" type="submit">{authMode === "signup" ? "Continuar" : "Entrar"}</button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="form-note">Ao continuar, você poderá recuperar a senha pelo e-mail.</p>
          </form>
        )}

        {step === "house" && (
          <form className="step-content form-step" onSubmit={(event) => { event.preventDefault(); setStep("presets"); }}>
            <button className="back" type="button" onClick={() => setStep("signup")}>← Voltar</button>
            <p className="eyebrow">Sua casa</p>
            <h1>Como vocês chamam a casa?</h1>
            <p className="lead">Pode deixar “Nossa casa”. Dá para mudar depois.</p>
            <label>Nome da casa<input value={houseName} onChange={(event) => setHouseName(event.target.value)} required /></label>
            <button className="button primary" type="submit">Continuar</button>
          </form>
        )}

        {step === "presets" && (
          <section className="step-content">
            <button className="back" type="button" onClick={() => setStep("house")}>← Voltar</button>
            <p className="eyebrow">Por onde começar</p>
            <h1>O que faz parte da casa?</h1>
            <p className="lead">Escolha algumas áreas. Você ajusta tudo quando quiser.</p>
            <div className="area-grid">
              {suggestedAreas.map((area) => {
                const isSelected = selectedAreas.has(area.id);
                return <button aria-pressed={isSelected} className={`area-choice ${isSelected ? "selected" : ""}`} key={area.id} onClick={() => setSelectedAreas((current) => { const next = new Set(current); if (next.has(area.id)) next.delete(area.id); else next.add(area.id); return next; })}>
                  <span aria-hidden="true">{area.icon}</span>{area.name}<b aria-hidden="true">{isSelected ? "✓" : "+"}</b>
                </button>;
              })}
            </div>
            <button className="button primary" onClick={finishOnboarding} disabled={selectedAreas.size === 0}>Continuar</button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>
        )}

        {step === "invite" && (
          <section className="step-content form-step">
            <button className="back" type="button" onClick={() => setStep("presets")}>← Voltar</button>
            <p className="eyebrow">Pessoas</p>
            <h1>Convide alguém da casa.</h1>
            <p className="lead">A pessoa entra direto nessa divisão quando aceitar. Você também pode fazer isso depois.</p>
            <label>E-mail de quem mora com você<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="alguem@email.com" autoComplete="email" /></label>
            <button className="button primary" onClick={sendInvite}>Enviar convite</button>
            <button className="button text-button" onClick={() => setStep("done")}>Fazer depois</button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>
        )}

        {step === "done" && (
          <section className="step-content done-step">
            <div className="success-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Tudo pronto</p>
            <h1>Bem-vindo à {houseName || "sua casa"}, {greeting}.</h1>
            <p className="lead">Agora vamos começar pelo que precisa acontecer — sem transformar a casa numa lista gigante.</p>
            <button className="button primary" onClick={() => router.push("/today")}>Ir para Hoje</button>
          </section>
        )}
      </section>
    </main>
  );
}
