"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MockArea, MockResponsibility, MockTask } from "@/lib/mock/store";
import { AppChrome } from "@/components/app-chrome";
import { AreaIcon } from "@/components/area-icon";
import { InlineSpinner } from "@/components/inline-spinner";
import feedbackStyles from "@/components/inline-spinner.module.css";
import completionStyles from "@/components/task-completion.module.css";

const recurrenceOptions = ["Diária", "Semanal", "3× por semana", "Mensal", "Uma vez"];
const apiTasks = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/tasks" : "/api/mock/tasks";
const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

type PeriodId = "daily" | "once" | "overdue" | "weekly" | "monthly";

function taskPeriod(task: MockTask): PeriodId {
  if (task.recurrence === "Diária") return "daily";
  if (task.recurrence === "Uma vez") return task.isOverdue ? "overdue" : "once";
  return task.recurrence === "Mensal" ? "monthly" : "weekly";
}

function responsibilityLabel(responsibility: MockResponsibility) {
  if (responsibility === "Nós") return "Compartilhada";
  if (responsibility === "Você") return "Sua responsabilidade";
  return "Responsabilidade da outra pessoa";
}

export function TodayMock({ household, initialAdd = false }: { household: { name: string; ownerName: string; areas: MockArea[]; tasks: MockTask[]; memberCount?: number; members?: Array<{ name: string; current?: boolean }> }; initialAdd?: boolean }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(household.tasks);
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [showAdd, setShowAdd] = useState(initialAdd);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState(household.areas[0]?.id ?? "");
  const [responsibility, setResponsibility] = useState<MockResponsibility>("Você");
  const [recurrence, setRecurrence] = useState("Diária");
  const [dueDate, setDueDate] = useState(localToday);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);
  const [workingTaskAction, setWorkingTaskAction] = useState<"claim" | "complete" | "transfer" | null>(null);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => { if (initialAdd) setShowAdd(true); }, [initialAdd]);

  const closeAdd = () => {
    resetForm();
    setShowAdd(false);
    if (initialAdd) router.replace("/today");
  };

  const routineTasks = tasks.filter((task) => !task.archived && task.occurrenceAvailable !== false && task.responsibility !== "Outra pessoa");
  const pending = routineTasks.filter((task) => !task.completed || task.id === celebratingTaskId);
  const periods = useMemo(() => ({
    daily: pending.filter((task) => taskPeriod(task) === "daily").length,
    once: pending.filter((task) => taskPeriod(task) === "once").length,
    overdue: pending.filter((task) => taskPeriod(task) === "overdue").length,
    weekly: pending.filter((task) => taskPeriod(task) === "weekly").length,
    monthly: pending.filter((task) => taskPeriod(task) === "monthly").length
  }), [pending]);
  const orderedAreas = useMemo(() => [...household.areas].sort((a, b) => a.sortOrder - b.sortOrder), [household.areas]);
  const areaGroups = orderedAreas.map((area) => ({
    area,
    tasks: pending.filter((task) => task.areaId === area.id)
  })).filter((group) => group.tasks.length > 0);
  const visibleGroups = selectedAreaId === "all" ? areaGroups : areaGroups.filter((group) => group.area.id === selectedAreaId);
  const otherPerson = household.members?.find((member) => member.current === false);

  const resetForm = () => {
    setName(""); setAreaId(household.areas[0]?.id ?? ""); setResponsibility("Você"); setRecurrence("Diária"); setDueDate(localToday()); setError("");
  };

  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    setAddingTask(true);
    try {
      const response = await fetch(apiTasks, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, areaId, responsibility, recurrence, ...(recurrence === "Uma vez" ? { dueDate } : {}) }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Não foi possível adicionar."); return; }
      setTasks((current) => [...current, data.task]); closeAdd();
    } catch {
      setError("Não foi possível adicionar a tarefa. Tente novamente.");
    } finally {
      setAddingTask(false);
    }
  };

  const updateTaskAction = async (taskId: string, action?: "claim" | "transfer") => {
    setError("");
    setNotice("");
    const originalTask = tasks.find((task) => task.id === taskId);
    if (!originalTask) return;
    setWorkingTaskId(taskId);
    setWorkingTaskAction(action ?? "complete");
    if (!action) setCelebratingTaskId(taskId);
    if (!action) {
      setTasks((current) => current.map((task) => {
        if (task.id !== taskId) return task;
        const target = task.targetCompletions ?? (task.recurrence === "3× por semana" ? 3 : 1);
        const completedCount = Math.min((task.completedCount ?? 0) + 1, target);
        const completed = completedCount >= target;
        return { ...task, completed, completedCount, ...(completed ? { completedAt: new Date().toISOString(), claimInProgress: false, claimOwnedByCurrentUser: false } : {}) };
      }));
    } else if (action === "claim") {
      setTasks((current) => current.map((task) => task.id === taskId ? { ...task, claimInProgress: true, claimOwnedByCurrentUser: true, claimOwnerName: household.ownerName } : task));
    }
    try {
      const response = await fetch(apiTasks, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId, ...(action ? { action } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.task) setTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
        else setTasks((current) => current.map((task) => task.id === taskId ? originalTask : task));
        setCelebratingTaskId(null);
        setError(data.error ?? "Não foi possível atualizar a tarefa.");
        return;
      }
      if (!data.task) {
        setTasks((current) => current.map((task) => task.id === taskId ? originalTask : task));
        setCelebratingTaskId(null);
        setError("Não recebemos a confirmação desta alteração. Atualize a tela para conferir o estado antes de tentar novamente.");
        return;
      }
      setTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
      if (action === "transfer") setNotice(`Responsabilidade passada para ${otherPerson?.name ?? "outra pessoa"}.`);
    } catch {
      setTasks((current) => current.map((task) => task.id === taskId ? originalTask : task));
      setCelebratingTaskId(null);
      setError(action === "transfer" ? "Não foi possível passar esta tarefa. Tente novamente." : "Não foi possível atualizar a tarefa. Tente novamente.");
    } finally {
      setWorkingTaskId(null);
      setWorkingTaskAction(null);
    }
  };

  const claim = (taskId: string) => updateTaskAction(taskId, "claim");
  const complete = (taskId: string) => updateTaskAction(taskId);
  const transfer = (taskId: string) => updateTaskAction(taskId, "transfer");

  return <main className="today-shell">
    <AppChrome current="today" />
    <section className="today-content">
      <div className="today-heading"><p className="eyebrow">Hoje · {household.name}</p><h1>Bom dia, {household.ownerName.split(" ")[0]} ☀️</h1><p className="lead">O que você cuida hoje?</p></div>
      <div className="today-progress-card"><div><span>Para hoje</span><strong>{periods.daily ? `${periods.daily} ${periods.daily === 1 ? "tarefa" : "tarefas"} para cuidar hoje` : "Sem tarefas diárias pendentes"}</strong></div><span className="today-period-summary">{[
        periods.weekly > 0 && `${periods.weekly} ${periods.weekly === 1 ? "tarefa" : "tarefas"} durante esta semana`,
        periods.monthly > 0 && `${periods.monthly} ${periods.monthly === 1 ? "tarefa" : "tarefas"} durante este mês`
      ].filter(Boolean).join(" · ") || (pending.length ? "Tudo de hoje está organizado por cômodo" : "Sem pendências")}</span></div>
      {orderedAreas.length > 0 && <div className="today-area-filter" role="group" aria-label="Filtrar tarefas por cômodo">
        <span className="today-area-filter-label">Cômodo</span>
        <div className="today-area-filter-options">
          <button type="button" className={`today-area-filter-chip${selectedAreaId === "all" ? " is-selected" : ""}`} aria-pressed={selectedAreaId === "all"} onClick={() => setSelectedAreaId("all")}>Todos</button>
          {orderedAreas.map((area) => {
            const count = pending.filter((task) => task.areaId === area.id).length;
            const selected = selectedAreaId === area.id;
            return <button type="button" key={area.id} className={`today-area-filter-chip${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => setSelectedAreaId(area.id)}>
              <AreaIcon name={area.name} fallback={area.icon} className="today-area-filter-icon" />
              <span>{area.name}</span>
              {count > 0 && <small>{count}</small>}
            </button>;
          })}
        </div>
      </div>}
      <div className="today-task-region" aria-live="polite" aria-busy={Boolean(workingTaskId || addingTask)}>
        {workingTaskId && <p className={feedbackStyles.actionStatus} role="status"><InlineSpinner /> Salvando a atualização…</p>}
        {notice && <p className="today-action-notice" role="status">{notice}</p>}
        {pending.length ? <div className="today-area-groups">{visibleGroups.length ? visibleGroups.map(({ area, tasks: areaTasks }) => <section className="today-area-group" key={area.id} aria-labelledby={`area-${area.id}`}>
          <div className="today-area-heading"><AreaIcon name={area.name} fallback={area.icon} className="today-area-heading-icon" /><div><h2 id={`area-${area.id}`}>{area.name}</h2><p>{areaTasks.length} {areaTasks.length === 1 ? "tarefa pendente" : "tarefas pendentes"}</p></div></div>
          <div className="task-list">{areaTasks.map((task) => {
            const shared = task.responsibility === "Nós";
            const claimedByOther = shared && task.claimInProgress && !task.claimOwnedByCurrentUser;
            const target = task.targetCompletions ?? (task.recurrence === "3× por semana" ? 3 : 1);
            const count = task.completedCount ?? 0;
            const hasWeeklyProgress = taskPeriod(task) === "weekly" && target > 1;
            const celebrating = celebratingTaskId === task.id;
            const working = workingTaskId === task.id;
            const dueDateLabel = task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
            const taskClasses = ["task-card", celebrating ? completionStyles.completing : "", celebrating && task.completed ? completionStyles.leaving : ""].filter(Boolean).join(" ");
            return <div className={taskClasses} key={task.id} onAnimationEnd={(event) => { if (event.target === event.currentTarget) setCelebratingTaskId((current) => current === task.id ? null : current); }}>
              <div className="task-card-main"><div><strong>{task.name}</strong><span>{task.recurrence} · {responsibilityLabel(task.responsibility)}</span>
                {task.recurrence === "Uma vez" && <span className={`task-due-label${task.isOverdue ? " is-overdue" : ""}`}>{task.isOverdue ? `Vencida desde ${dueDateLabel}` : `Prazo ${dueDateLabel}`}</span>}
                {hasWeeklyProgress && <div className="task-period-progress"><span>{count} de {target} nesta semana</span><span className="progress-track"><i style={{ width: `${Math.min(100, count / target * 100)}%` }} /></span></div>}
                {claimedByOther && <span>Em andamento com {task.claimOwnerName ?? "outra pessoa"}</span>}
              </div></div>
              <div className="today-task-actions">
                {(household.memberCount ?? 1) > 1 && task.responsibility === "Você" && <button type="button" className="today-transfer-button" disabled={working} onClick={() => transfer(task.id)}>{working && workingTaskAction === "transfer" ? <><InlineSpinner /> Passando…</> : `Passar para ${otherPerson?.name ?? "outra pessoa"}`}</button>}
                {!claimedByOther && <button className={`complete-button ${shared && !task.claimOwnedByCurrentUser ? "claim-action" : "complete-action"} ${celebrating ? completionStyles.completionButton : ""}`} disabled={working} onClick={() => shared && !task.claimOwnedByCurrentUser ? claim(task.id) : complete(task.id)}>{working && !celebrating && workingTaskAction !== "transfer" && <InlineSpinner />}{celebrating ? "Feito!" : working && workingTaskAction === "complete" ? "Concluindo…" : shared && !task.claimOwnedByCurrentUser ? "Vou cuidar" : "✓ Concluir"}{celebrating && <span className={completionStyles.sparkles} aria-hidden="true"><i>✦</i><i>✦</i><i>•</i></span>}</button>}
              </div>
            </div>;
          })}</div>
        </section>) : <div className="empty-card today-filter-empty"><div className="empty-icon" aria-hidden="true">🌿</div><h2>Nada pendente neste cômodo.</h2><p>As tarefas de outros cômodos continuam em Todos.</p></div>}</div> : <div className="empty-card"><div className="empty-icon" aria-hidden="true">✨</div><h2>Tudo certo por hoje.</h2><p>Você cuidou do que precisava acontecer.</p></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <div className="today-action-footer"><button className="button primary" disabled={addingTask} onClick={() => { setError(""); setShowAdd(true); }}>Adicionar tarefa</button></div>
    </section>
    {showAdd && <div className="modal-backdrop today-add-backdrop"><section className="task-form-modal today-add-modal" role="dialog" aria-modal="true" aria-labelledby="today-add-title"><div className="task-form-heading"><div><span className="drawer-kicker">Nova responsabilidade</span><h2 id="today-add-title">O que precisa acontecer?</h2></div><button className="drawer-close" type="button" disabled={addingTask} onClick={closeAdd} aria-label="Fechar formulário">×</button></div><form onSubmit={addTask} aria-busy={addingTask}><label>Nome da tarefa<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Trocar roupa de cama" required /></label><label>Área<span className="area-select-control"><AreaIcon name={household.areas.find((area) => area.id === areaId)?.name ?? ""} /><select value={areaId} onChange={(event) => setAreaId(event.target.value)}>{household.areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></span></label><label>Responsabilidade<select value={responsibility} onChange={(event) => setResponsibility(event.target.value as MockResponsibility)}><option>Você</option><option>Outra pessoa</option><option>Nós</option></select></label><label>Frequência<select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}>{recurrenceOptions.map((option) => <option key={option}>{option}</option>)}</select></label>{recurrence === "Uma vez" && <label>Prazo<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /><small>Ela aparece em Hoje quando chegar o prazo e fica lá até ser concluída ou removida da rotina.</small></label>}{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" disabled={addingTask} onClick={closeAdd}>Cancelar</button><button className="button primary" disabled={addingTask}>{addingTask && <InlineSpinner />}{addingTask ? "Adicionando…" : "Adicionar"}</button></div></form></section></div>}
  </main>;
}
