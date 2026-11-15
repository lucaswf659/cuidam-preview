"use client";

import { FormEvent, useState } from "react";
import type { MockArea, MockResponsibility, MockTask } from "@/lib/mock/store";
import { LogoutButton } from "@/components/logout-button";

const recurrenceOptions = ["Diária", "Semanal", "3× por semana", "Mensal"];
const apiTasks = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/tasks" : "/api/mock/tasks";

export function TodayMock({ household }: { household: { name: string; ownerName: string; areas: MockArea[]; tasks: MockTask[] } }) {
  const [tasks, setTasks] = useState(household.tasks);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState(household.areas[0]?.id ?? "");
  const [responsibility, setResponsibility] = useState<MockResponsibility>("Você");
  const [recurrence, setRecurrence] = useState("Diária");
  const [load, setLoad] = useState(2);
  const [error, setError] = useState("");
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);

  const routineTasks = tasks.filter((task) => !task.archived && task.responsibility !== "Outra pessoa");
  const pending = routineTasks.filter((task) => !task.completed);
  const completedCount = routineTasks.length - pending.length;
  const progress = routineTasks.length ? Math.round((completedCount / routineTasks.length) * 100) : 0;

  const resetForm = () => {
    setName(""); setAreaId(household.areas[0]?.id ?? ""); setResponsibility("Você"); setRecurrence("Diária"); setLoad(2); setError("");
  };

  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const response = await fetch(apiTasks, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, areaId, responsibility, recurrence, load }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Não foi possível adicionar."); return; }
    setTasks((current) => [...current, data.task]); resetForm(); setShowAdd(false);
  };

  const updateTaskAction = async (taskId: string, action?: "claim") => {
    setError("");
    setWorkingTaskId(taskId);
    try {
      const response = await fetch(apiTasks, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId, ...(action ? { action } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.task) setTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
        setError(data.error ?? "Não foi possível atualizar a tarefa.");
        return;
      }
      if (!data.task) {
        setError("Não recebemos a confirmação desta alteração. Atualize a tela para conferir o estado antes de tentar novamente.");
        return;
      }
      setTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
    } catch {
      setError("Não foi possível atualizar a tarefa. Tente novamente.");
    } finally {
      setWorkingTaskId(null);
    }
  };

  const claim = (taskId: string) => updateTaskAction(taskId, "claim");
  const complete = (taskId: string) => updateTaskAction(taskId);

  return <main className="today-shell">
    <div className="topbar"><div className="brand-lockup" aria-label="cuidam"><span className="brand-mark">⌂</span><span>cuidam</span></div><LogoutButton /></div>
    <section className="today-content">
      <div className="today-heading"><p className="eyebrow">Hoje · {household.name}</p><h1>Bom dia, {household.ownerName.split(" ")[0]} ☀️</h1><p className="lead">O que você cuida hoje?</p></div>
      <div className="today-progress-card"><div><span>Seu progresso</span><strong>{completedCount === routineTasks.length && routineTasks.length ? "Tudo em dia por hoje" : completedCount ? "Sua parte está andando" : "Vamos começar"}</strong></div><b>{completedCount} de {routineTasks.length}</b><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div>
      <div className="today-task-region" aria-live="polite">{pending.length ? <div className="task-list">{pending.map((task) => { const area = household.areas.find((item) => item.id === task.areaId); const responsibilityLabel = task.responsibility === "Nós" ? "Compartilhada" : "Sua responsabilidade"; const shared = task.responsibility === "Nós"; const claimedByOther = shared && task.claimInProgress && !task.claimOwnedByCurrentUser; return <div className="task-card" key={task.id}><div className="task-card-main"><span className="task-area-icon" aria-hidden="true">{area?.icon ?? "⌂"}</span><div><strong>{task.name}</strong><span>{area?.name ?? "Casa"} · {task.recurrence} · carga {task.load} · {responsibilityLabel}</span>{claimedByOther && <span>Em andamento com {task.claimOwnerName ?? "outra pessoa"}</span>}</div></div>{!claimedByOther && <button className="complete-button" disabled={workingTaskId === task.id} onClick={() => shared && !task.claimOwnedByCurrentUser ? claim(task.id) : complete(task.id)}>{workingTaskId === task.id ? "Salvando…" : shared && !task.claimOwnedByCurrentUser ? "Vou cuidar" : "✓ Concluir"}</button>}</div>; })}</div> : <div className="empty-card"><div className="empty-icon" aria-hidden="true">✨</div><h2>Tudo certo por hoje.</h2><p>Você cuidou do que precisava acontecer.</p></div>}{error && <p className="form-error" role="alert">{error}</p>}</div>
      <div className="today-action-footer"><button className="button primary" onClick={() => { setError(""); setShowAdd(true); }}>Adicionar tarefa</button></div>
    </section>
    {showAdd && <div className="modal-backdrop today-add-backdrop"><section className="task-form-modal today-add-modal" role="dialog" aria-modal="true" aria-labelledby="today-add-title"><div className="task-form-heading"><div><span className="drawer-kicker">Nova responsabilidade</span><h2 id="today-add-title">O que precisa acontecer?</h2></div><button className="drawer-close" type="button" onClick={() => { resetForm(); setShowAdd(false); }} aria-label="Fechar formulário">×</button></div><form onSubmit={addTask}><label>Nome da tarefa<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Trocar roupa de cama" required /></label><label>Área<select value={areaId} onChange={(event) => setAreaId(event.target.value)}>{household.areas.map((area) => <option value={area.id} key={area.id}>{area.icon} {area.name}</option>)}</select></label><label>Responsabilidade<select value={responsibility} onChange={(event) => setResponsibility(event.target.value as MockResponsibility)}><option>Você</option><option>Outra pessoa</option><option>Nós</option></select></label><label>Frequência<select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}>{recurrenceOptions.map((option) => <option key={option}>{option}</option>)}</select></label><fieldset className="load-dots"><legend>Carga <span>{load} de 5</span></legend><div>{[1, 2, 3, 4, 5].map((value) => <button type="button" className={value <= load ? "selected" : ""} aria-label={`Carga ${value} de 5`} aria-pressed={value === load} onClick={() => setLoad(value)} key={value} />)}</div></fieldset>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => { resetForm(); setShowAdd(false); }}>Cancelar</button><button className="button primary">Adicionar</button></div></form></section></div>}
    <nav className="bottom-nav"><a className="active" href="/today"><b>☀️</b>Hoje</a><a href="/nos"><b>🤝</b>Nós</a><a href="/rewards"><b>✦</b>Recompensas</a><a href="/casa"><b>🏡</b>Casa</a></nav>
  </main>;
}

