"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmRecoveryLink({ tokenHash, type, next }: { tokenHash: string; type: "recovery" | "email" | ""; next: string }) {
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const confirm = async () => {
    setError("");
    setConfirming(true);
    try {
      const response = await fetch(type === "email" ? "/api/auth/confirm-signup" : "/api/auth/confirm-recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenHash, next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Não foi possível confirmar este link.");
      }
      const body = await response.json().catch(() => null);
      router.replace(type === "email" ? (body?.next ?? "/entrar?confirmed=1") : "/auth/reset-password");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar este link.");
      setConfirming(false);
    }
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card" aria-live="polite">
        <div className="brand-lockup" aria-label="cuidam"><span>cuidam</span></div>
        <div className="step-content form-step">
          <p className="eyebrow">{type === "email" ? "Confirmação de e-mail" : "Acesso à conta"}</p>
          <h1>{type === "email" ? "Só falta confirmar seu e-mail." : "Vamos confirmar seu pedido."}</h1>
          <p className="lead">{type === "email" ? "Confirme para voltar ao Cuidam e continuar." : "Confirme para abrir a troca de senha. Esse passo impede que pré-visualizações automáticas do e-mail consumam o link."}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary" type="button" onClick={confirm} disabled={!tokenHash || confirming}>
            {confirming ? "Confirmando…" : type === "email" ? "Confirmar e continuar" : "Continuar para trocar a senha"}
          </button>
          {!tokenHash && <p className="form-error" role="alert">{type === "email" ? "Este link está incompleto. Peça uma nova confirmação." : "Este link está incompleto. Peça uma nova mensagem de recuperação."}</p>}
        </div>
      </section>
    </main>
  );
}

