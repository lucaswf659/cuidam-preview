"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    createClient().auth.getSession().then(({ data }) => {
      if (active) {
        setHasSession(Boolean(data.session));
        setCheckingSession(false);
      }
    }).catch(() => {
      if (active) setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível atualizar a senha. Peça um novo link e tente novamente.");
      setSaving(false);
      return;
    }
    router.replace("/today");
    router.refresh();
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card" aria-live="polite">
        <div className="brand-lockup" aria-label="cuidam"><span>cuidam</span></div>
        {checkingSession ? <p className="step-content" role="status">Verificando o link…</p> : !hasSession ? (
          <div className="step-content form-step">
            <p className="eyebrow">Acesso à conta</p>
            <h1>Não conseguimos validar este link.</h1>
            <p className="lead">Este link expirou, já foi usado ou não pôde ser confirmado. Peça uma nova mensagem de recuperação e tente novamente.</p>
            <button className="button primary" onClick={() => router.replace("/entrar?mode=login")}>Voltar para entrar</button>
          </div>
        ) : (
          <form className="step-content form-step" onSubmit={updatePassword}>
            <p className="eyebrow">Acesso à conta</p>
            <h1>Escolha uma nova senha.</h1>
            <p className="lead">Use pelo menos 8 caracteres.</p>
            <label>Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            <label>Confirme a nova senha<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar nova senha"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

