"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { AreaIcon } from "@/components/area-icon";
import { BrandMark } from "@/components/brand-mark";
import { defaultOnboardingTaskKeys, onboardingSuggestionsForAreas, type OnboardingSuggestion } from "@/lib/onboarding-suggestions";
import suggestionStyles from "@/components/onboarding-suggestions.module.css";

type Step = "welcome" | "signup" | "house" | "presets" | "invite" | "done";
type AuthMode = "signup" | "login";

type OnboardingFlowProps = { initialStep?: Step; initialMode?: AuthMode; initialName?: string; initialEmail?: string; confirmationCompleted?: boolean; reopenableHouseholds?: Array<{ id: string; name: string }>; reopenError?: string; };

const suggestedAreas = [
  { id: "kitchen", icon: "🍳", name: "Cozinha", selected: true },
  { id: "living", icon: "🛋️", name: "Sala", selected: true },
  { id: "bathroom", icon: "🫧", name: "Banheiro", selected: true },
  { id: "bedroom", icon: "🛏️", name: "Quartos", selected: true },
  { id: "office", icon: "💻", name: "Escritório", selected: false },
  { id: "pets", icon: "🐾", name: "Pets", selected: false }
];

export function OnboardingFlow({ initialStep = "welcome", initialMode = "signup", initialName = "", initialEmail = "", confirmationCompleted = false, reopenableHouseholds = [], reopenError = "" }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [requestingRecovery, setRequestingRecovery] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [houseName, setHouseName] = useState("Nossa casa");
  const [availablePreviousHouses, setAvailablePreviousHouses] = useState(reopenableHouseholds);
  const [previousHouseId, setPreviousHouseId] = useState(reopenableHouseholds[0]?.id ?? "");
  const [error, setError] = useState(() => ({
    session: "Sua sessão expirou. Entre novamente para reabrir a casa.",
    choose: "Escolha uma casa para reabrir.",
    unavailable: "Esta casa não está disponível para reabertura nesta conta.",
    occupied: "Alguém ainda está nesta casa. Peça um novo convite para voltar."
  }[reopenError] ?? ""));
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);
  const [confirmationResent, setConfirmationResent] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState(() =>
    new Set(suggestedAreas.filter((area) => area.selected).map((area) => area.id))
  );
  const [suggestedTasks, setSuggestedTasks] = useState<OnboardingSuggestion[]>(() => onboardingSuggestionsForAreas(suggestedAreas.filter((area) => area.selected).map((area) => area.id)));
  const [selectedTaskKeys, setSelectedTaskKeys] = useState(() => defaultOnboardingTaskKeys(onboardingSuggestionsForAreas(suggestedAreas.filter((area) => area.selected).map((area) => area.id))));
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
        if (householdData.household) { router.replace("/today"); return; }
        const previousHouses = Array.isArray(householdData.reopenableHouseholds) ? householdData.reopenableHouseholds as Array<{ id: string; name: string }> : [];
        setAvailablePreviousHouses(previousHouses);
        setPreviousHouseId(previousHouses[0]?.id ?? "");
      }
      setStep("house");
      return;
    }
    const auth = createClient();
    const result = authMode === "signup"
      ? await auth.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/entrar` } })
      : await auth.auth.signInWithPassword({ email, password });
    if (result.error) {
      const code = "code" in result.error ? result.error.code : undefined;
      setError(code === "email_not_confirmed"
        ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
        : "Não foi possível entrar. Confira seu e-mail e sua senha.");
      return;
    }
    if (!result.data.session && authMode === "signup") {
      setAuthMode("login");
      setPassword("");
      setSignupConfirmationSent(true);
      return;
    }
    if (authMode === "login") {
      const householdResponse = await fetch("/api/onboarding");
      if (!householdResponse.ok) { setError("Não foi possível recuperar sua casa."); return; }
      const householdData = await householdResponse.json();
      if (householdData.household) {
        router.replace("/today");
        return;
      }
      const previousHouses = Array.isArray(householdData.reopenableHouseholds) ? householdData.reopenableHouseholds as Array<{ id: string; name: string }> : [];
      setAvailablePreviousHouses(previousHouses);
      setPreviousHouseId(previousHouses[0]?.id ?? "");
    }
    setStep("house");
  };

  const requestPasswordRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setRequestingRecovery(true);
    try {
      const { error: recoveryError } = await createClient().auth.resetPasswordForEmail(email);
      if (recoveryError) throw recoveryError;
      setRecoverySent(true);
    } catch (cause) {
      const isRateLimited = typeof cause === "object" && cause !== null && "status" in cause && cause.status === 429;
      setError(isRateLimited
        ? "Muitos pedidos em pouco tempo. Aguarde um pouco antes de tentar novamente."
        : "Não foi possível enviar as instruções agora. Tente novamente mais tarde.");
    } finally {
      setRequestingRecovery(false);
    }
  };

  const resendSignupConfirmation = async () => {
    setError("");
    setResendingConfirmation(true);
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/entrar` },
      });
      if (resendError) throw resendError;
      setConfirmationResent(true);
    } catch (cause) {
      const isRateLimited = typeof cause === "object" && cause !== null && "status" in cause && cause.status === 429;
      setError(isRateLimited
        ? "Muitos pedidos em pouco tempo. Aguarde um pouco antes de tentar novamente."
        : "Não foi possível reenviar agora. Tente novamente mais tarde.");
    } finally {
      setResendingConfirmation(false);
    }
  };

  const finishOnboarding = async () => {
    setError("");
    const onboardingName = name.trim() || email.trim().split("@")[0] || "Você";
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: onboardingName, houseName, areas: suggestedAreas.filter((area) => selectedAreas.has(area.id)), tasks: suggestedTasks.filter((task) => selectedAreas.has(task.areaId) && selectedTaskKeys.has(task.id)).map(({ selectedByDefault: _selectedByDefault, ...task }) => task) }) });
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? "Não foi possível salvar sua casa."); return; }
    setStep("invite");
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) { setStep("done"); return; }
    const response = await fetch(inviteEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    if (!response.ok) { setError("Não foi possível gerar o convite. Confira o e-mail e tente novamente."); return; }
    const data = await response.json().catch(() => null);
    setInviteUrl(data?.inviteUrl ? new URL(data.inviteUrl, window.location.origin).toString() : "");
    setStep("done");
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try { await navigator.clipboard.writeText(inviteUrl); setError("Link copiado."); }
    catch { setError("Não foi possível copiar automaticamente. Selecione e copie o link abaixo."); }
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreas((current) => {
      const next = new Set(current);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
    if (!selectedAreas.has(areaId)) {
      const defaults = onboardingSuggestionsForAreas([areaId]);
      setSuggestedTasks((current) => [...current, ...defaults.filter((task) => !current.some((item) => item.areaId === task.areaId && item.name === task.name))]);
      setSelectedTaskKeys((current) => new Set([...current, ...defaultOnboardingTaskKeys(defaults)]));
    }
  };

  const greeting = name.trim() ? name.trim().split(" ")[0] : "você";

  return (
    <main className="onboarding-shell">
      <section className={`onboarding-card ${step === "presets" ? suggestionStyles.wideCard : ""}`} aria-live="polite">
        <div className="brand-lockup" aria-label="cuidam">
          <span className="brand-mark" aria-hidden="true"><BrandMark compact /></span>
          <span>cuidam</span>
        </div>

        {step === "welcome" && (
          <div className="welcome-step step-content">
            <div className="organic-shape" aria-hidden="true"><BrandMark /></div>
            <p className="eyebrow">Uma casa mais leve</p>
            <h1>Cada um cuida do que é seu.</h1>
            <p className="lead">Organize a rotina da casa, sozinho ou com quem divide esse cuidado com você.</p>
            <div className="actions stacked-actions">
              <button className="button primary" onClick={() => { setAuthMode("signup"); setStep("signup"); }}>Criar conta</button>
              <button className="button secondary" onClick={() => { setAuthMode("login"); setStep("signup"); }}>Já tenho uma conta</button>
            </div>
            <p className="microcopy">Comece sozinho. Convide alguém quando fizer sentido.</p>
          </div>
        )}

        {step === "signup" && (
          recoveringPassword ? (
            <form className="step-content form-step" onSubmit={requestPasswordRecovery}>
              <button className="back" type="button" onClick={() => { setRecoveringPassword(false); setRecoverySent(false); setError(""); }}>← Voltar para entrar</button>
              <p className="eyebrow">Acesso à conta</p>
              <h1>Vamos recuperar seu acesso.</h1>
              <p className="lead">Informe o e-mail da sua conta. Se houver uma conta associada, enviaremos as instruções para redefinir a senha.</p>
              <label>E-mail<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setRecoverySent(false); }} placeholder="voce@email.com" autoComplete="email" required /></label>
              {recoverySent ? <p className="form-success" role="status">Se houver uma conta associada a esse e-mail, as instruções chegarão em instantes.</p> : <button className="button primary" type="submit" disabled={requestingRecovery}>{requestingRecovery ? "Enviando…" : "Enviar instruções"}</button>}
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
          ) :
          signupConfirmationSent ? (
          <section className="step-content form-step">
            <button className="back" type="button" onClick={() => { setSignupConfirmationSent(false); setConfirmationResent(false); setAuthMode("signup"); setPassword(""); setError(""); }}>← Corrigir e-mail</button>
            <p className="eyebrow">Confirmação de e-mail</p>
            <h1>Mensagem enviada.</h1>
            <p className="lead">Enviamos um link de confirmação para <strong>{email}</strong>.</p>
            <p className="form-note">Abra a mensagem para confirmar sua conta. Se não encontrar, confira a pasta de spam. O link abre o Cuidam e continua a configuração da casa.</p>
            {confirmationResent && <p className="form-success" role="status">Enviamos outra mensagem de confirmação.</p>}
            <button className="button primary" type="button" onClick={resendSignupConfirmation} disabled={resendingConfirmation}>{resendingConfirmation ? "Reenviando…" : "Reenviar confirmação"}</button>
            <button className="button text-button" type="button" onClick={() => { setSignupConfirmationSent(false); setConfirmationResent(false); setAuthMode("login"); setPassword(""); setError(""); }}>Já confirmei meu e-mail</button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>
          ) : <form className="step-content form-step" onSubmit={continueSignup}>
            <button className="back" type="button" onClick={() => { setStep("welcome"); setSignupConfirmationSent(false); setError(""); }}>← Voltar</button>
            <p className="eyebrow">{authMode === "signup" ? "Começando" : "De volta à casa"}</p>
            <h1>{authMode === "signup" ? "Vamos deixar isso fácil." : "Que bom ter você de volta."}</h1>
            <p className="lead">{authMode === "signup" ? "Crie sua conta. Você configura a casa em seguida." : "Entre para continuar de onde parou."}</p>
            {authMode === "signup" && <label>Seu nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos te chamar?" autoComplete="name" required /></label>}
            <label>E-mail<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSignupConfirmationSent(false); }} placeholder="voce@email.com" autoComplete="email" required /></label>
            <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
            <button className="button primary" type="submit">{authMode === "signup" ? "Continuar" : "Entrar"}</button>
            {error && <p className="form-error" role="alert">{error}</p>}
            {authMode === "login" && process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" && <button className="button text-button" type="button" onClick={() => { setRecoveringPassword(true); setError(""); }}>Esqueci minha senha</button>}
            {authMode === "signup" && process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" && <p className="form-note">Você poderá recuperar a senha pelo e-mail.</p>}
          </form>
        )}

        {step === "house" && (
          <section className="step-content form-step">
            {confirmationCompleted && <p className="form-success" role="status">E-mail confirmado. Agora vamos configurar sua casa.</p>}
            <button className="back" type="button" onClick={() => setStep("signup")}>← Voltar</button>
            <p className="eyebrow">Sua casa</p>
            <h1>Que nome vamos dar à sua casa?</h1>
            <p className="lead">Pode deixar “Nossa casa”. Você pode organizar sua rotina sozinho e convidar alguém depois.</p>
            {error && availablePreviousHouses.length === 0 && <p className="form-error" role="alert">{error}</p>}
            {availablePreviousHouses.length > 0 && <form className="reopen-house-panel" action="/api/household/reactivate" method="post" aria-labelledby="reopen-house-title">
              <h2 id="reopen-house-title">Ou volte para uma casa anterior</h2>
              <p>As casas desativadas ficam guardadas com todo o histórico. Você pode reabri-las quando quiser.</p>
              <label>Casa anterior<select name="householdId" value={previousHouseId} onChange={(event) => setPreviousHouseId(event.target.value)}><option value="">Escolha uma casa</option>{availablePreviousHouses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label>
              <button className="button secondary" type="submit" disabled={!previousHouseId}>Reabrir casa</button>
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>}
            {availablePreviousHouses.length > 0 && <p className="form-note reopen-house-or">Ou crie uma nova casa</p>}
            <form className="form-step" onSubmit={(event) => { event.preventDefault(); setStep("presets"); }}>
              <label>Nome da casa<input value={houseName} onChange={(event) => setHouseName(event.target.value)} required /></label>
              <button className="button primary" type="submit">Continuar</button>
            </form>
          </section>
        )}

        {step === "presets" && (
          <section className={`step-content ${suggestionStyles.suggestionStep}`}>
            <button className="back" type="button" onClick={() => setStep("house")}>← Voltar</button>
            <p className="eyebrow">Por onde começar</p>
            <h1>O que faz parte da casa?</h1>
            <p className="lead">As sugestões vêm prontas, mas vocês decidem o que entra e como dividir.</p>
            <div className="area-grid">
              {suggestedAreas.map((area) => {
                const isSelected = selectedAreas.has(area.id);
                return <button aria-pressed={isSelected} className={`area-choice ${isSelected ? "selected" : ""}`} key={area.id} onClick={() => toggleArea(area.id)}>
                  <AreaIcon name={area.id} fallback={area.icon} />{area.name}<b aria-hidden="true">{isSelected ? "✓" : "+"}</b>
                </button>;
              })}
            </div>
            {selectedAreas.size > 0 && <section className={`onboarding-task-suggestions ${suggestionStyles.suggestions}`} aria-label="Sugestões de responsabilidades">
              <h2>Primeira divisão</h2>
              <p>Já deixamos uma primeira divisão pronta para você começar. Ajuste nomes, responsáveis e frequência se quiser; tudo pode ser revisto depois.</p>
              <p className="form-note">A divisão também considera o esforço de cada tarefa por trás das cenas. Se alguma estimativa não combinar com sua rotina, você pode ajustá-la depois.</p>
              <div className={suggestionStyles.listHeading}><strong>Opções sugeridas</strong><span>As extras estão desmarcadas. Role para explorar e inclua só o que fizer parte da rotina.</span></div>
              <div className={suggestionStyles.list} role="region" aria-label="Lista de sugestões. Role para ver mais opções" tabIndex={0}>
              {suggestedTasks.filter((task) => selectedAreas.has(task.areaId)).map((task) => { const taskKey = task.id; const checked = selectedTaskKeys.has(taskKey); return <div className={`onboarding-suggestion-row ${suggestionStyles.row} ${checked ? "" : "suggestion-disabled"}`} key={taskKey}>
                <div className="onboarding-suggestion-name"><input type="checkbox" aria-label={`Incluir ${task.name}`} checked={checked} onChange={() => setSelectedTaskKeys((current) => { const next = new Set(current); if (next.has(taskKey)) next.delete(taskKey); else next.add(taskKey); return next; })} /><span><small>{suggestedAreas.find((area) => area.id === task.areaId)?.name}</small><input aria-label={`${task.name}: nome`} disabled={!checked} value={task.name} onChange={(event) => setSuggestedTasks((current) => current.map((item) => item.id === task.id ? { ...item, name: event.target.value } : item))} /></span></div>
                <label className="onboarding-suggestion-field"><span>Responsabilidade</span><select disabled={!checked} aria-label={`${task.name}: responsabilidade`} value={task.responsibility} onChange={(event) => setSuggestedTasks((current) => current.map((item) => item === task ? { ...item, responsibility: event.target.value as OnboardingSuggestion["responsibility"] } : item))}><option>Você</option><option>Outra pessoa</option><option>Nós</option></select></label>
                <label className="onboarding-suggestion-field"><span>Frequência</span><select disabled={!checked} aria-label={`${task.name}: frequência`} value={task.recurrence} onChange={(event) => setSuggestedTasks((current) => current.map((item) => item === task ? { ...item, recurrence: event.target.value } : item))}><option>Diária</option><option>Semanal</option><option>3× por semana</option><option>Mensal</option></select></label>
              </div>; })}
              </div>
              {!suggestedTasks.some((task) => selectedAreas.has(task.areaId) && selectedTaskKeys.has(task.id)) && <p className="form-note">Nenhuma sugestão selecionada. Vocês podem adicionar tarefas depois.</p>}
            </section>}
            <button className="button primary" onClick={finishOnboarding} disabled={selectedAreas.size === 0}>Continuar</button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>
        )}

        {step === "invite" && (
          <section className="step-content form-step">
            <button className="back" type="button" onClick={() => setStep("presets")}>← Voltar</button>
            <p className="eyebrow">Pessoas</p>
            <h1>Convide alguém, se fizer sentido.</h1>
            <p className="lead">Você pode usar o Cuidam sozinho. Se quiser dividir o cuidado com outra pessoa, gere um link e compartilhe por onde preferir.</p>
            <label>E-mail de quem mora com você<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="alguem@email.com" autoComplete="email" /></label>
            <button className="button primary" onClick={sendInvite}>Gerar link do convite</button>
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
            {inviteUrl && <div className="onboarding-invite-link"><p>Link pronto para compartilhar. Nenhum e-mail foi enviado.</p><input aria-label="Link do convite" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /><button className="button secondary" onClick={copyInvite}>Copiar link</button>{error && <p className="form-note" role="status">{error}</p>}</div>}
            <button className="button primary" onClick={() => router.push("/today")}>Ir para Hoje</button>
          </section>
        )}
      </section>
    </main>
  );
}
