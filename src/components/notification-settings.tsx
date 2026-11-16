"use client";

import { useEffect, useState } from "react";
import type { NotificationPreferences } from "@/lib/mock/store";
import { defaultNotificationPreferences } from "@/lib/real/notifications";
import { AppChrome } from "@/components/app-chrome";

type Status = "loading" | "ready" | "saving" | "saved" | "error";

export function NotificationSettings({ householdName }: { householdName: string }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const load = async () => {
    setStatus("loading"); setError("");
    try {
      const response = await fetch("/api/notification-preferences", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as preferências.");
      setPreferences({ ...defaultNotificationPreferences, ...data.preferences });
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Confira sua conexão e tente novamente.");
      setStatus("error");
    }
  };

  useEffect(() => { void load(); }, []);

  const update = (change: Partial<NotificationPreferences>) => {
    setPreferences((current) => ({ ...current, ...change }));
    setStatus("ready"); setError("");
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setStatus("saving"); setError("");
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(preferences)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar as preferências.");
      setPreferences({ ...defaultNotificationPreferences, ...data.preferences });
      setStatus("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Confira sua conexão e tente novamente.");
      setStatus("error");
    }
  };

  return <main className="casa-shell">
    <AppChrome current="casa" />
    <section className="casa-content notification-content">
      <a className="back-link" href="/casa">← Casa</a>
      <div className="casa-heading"><p className="eyebrow">Casa · {householdName}</p><h1>Notificações</h1><p className="lead">Lembrar, nunca cobrar. Ajuste o que faz sentido receber.</p></div>
      <form className="notification-card" onSubmit={save}>
        <fieldset disabled={status === "loading" || status === "saving"}>
          <legend>Seus lembretes</legend>
          <label className="notification-option"><span><strong>Suas tarefas do dia</strong><small>Um lembrete agrupado pela manhã</small></span><input aria-label="Suas tarefas do dia" type="checkbox" checked={preferences.morningReminder} onChange={(event) => update({ morningReminder: event.target.checked })} /></label>
          <label className="notification-option"><span><strong>Tarefa compartilhada</strong><small>Avisar quando alguém assumir uma tarefa compartilhada</small></span><input aria-label="Tarefa compartilhada" type="checkbox" checked={preferences.sharedTask} onChange={(event) => update({ sharedTask: event.target.checked })} /></label>
          <label className="notification-option"><span><strong>Atividade da casa</strong><small>Conclusões importantes dos membros</small></span><input aria-label="Atividade da casa" type="checkbox" checked={preferences.activity} onChange={(event) => update({ activity: event.target.checked })} /></label>
          <div className="notification-quiet"><div><strong>Silêncio</strong><small>Lembretes não críticos ficam pausados nesse período</small></div><div className="quiet-times"><label>Das<input aria-label="Início do silêncio" type="time" value={preferences.quietStart} onChange={(event) => update({ quietStart: event.target.value })} required /></label><label>Até<input aria-label="Fim do silêncio" type="time" value={preferences.quietEnd} onChange={(event) => update({ quietEnd: event.target.value })} required /></label></div></div>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        {status === "saved" && <p className="form-success" role="status">Preferências salvas.</p>}
        <button className="button primary notification-save" type="submit" disabled={status === "loading" || status === "saving"}>{status === "loading" ? "Carregando…" : status === "saving" ? "Salvando…" : "Salvar preferências"}</button>
        {status === "error" && <button className="button secondary notification-retry" type="button" onClick={() => void load()}>Tentar novamente</button>}
      </form>
      <p className="notification-note">O lembrete matinal reúne suas tarefas em uma única notificação. Você pode mudar essas opções quando quiser.</p>
    </section>
  </main>;
}

