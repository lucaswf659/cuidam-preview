"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MockArea, MockResponsibility, MockTask } from "@/lib/mock/store";

const frequencyCount: Record<string, number> = { "Diária": 7, "Semanal": 1, "3× por semana": 3, "Mensal": 1 };
const recurrenceOptions = ["Diária", "Semanal", "3× por semana", "Mensal"];
const apiTasks = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/tasks" : "/api/mock/tasks";

function score(task: MockTask) {
  const occurrences = frequencyCount[task.recurrence] ?? 1;
  return task.load * (1 + (0.5 * (occurrences - 1)) / occurrences);
}

function responsibilityLabel(responsibility: MockResponsibility) {
  return responsibility === "Nós" ? "Compartilhada" : responsibility;
}

type TaskForm = {
  mode: "add" | "edit";
  taskId?: string;
  name: string;
  areaId: string;
  responsibility: MockResponsibility;
  recurrence: string;
  load: number;
};

function blankTaskForm(areaId: string): TaskForm {
  return { mode: "add", name: "", areaId, responsibility: "Você", recurrence: "Diária", load: 2 };
}

export function NosMock({ household }: { household: { name: string; ownerName: string; areas: MockArea[]; tasks: MockTask[] } }) {
  const searchParams = useSearchParams();
  const areaFromQuery = searchParams.get("area");
  const [tasks, setTasks] = useState(household.tasks);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (areaFromQuery && household.areas.some((area) => area.id === areaFromQuery)) setSelectedAreaId(areaFromQuery);
  }, [areaFromQuery, household.areas]);

  const activeTasks = tasks.filter((task) => !task.completed && !task.archived);
  const scores = activeTasks.reduce((result, task) => {
    const value = score(task);
    if (task.responsibility === "Você") result.you += value;
    else if (task.responsibility === "Outra pessoa") result.other += value;
    else result.shared += value;
    return result;
  }, { you: 0, other: 0, shared: 0 });
  const totalScore = scores.you + scores.other + scores.shared;
  const peopleScore = scores.you + scores.other;
  const percent = (value: number) => totalScore ? Math.round((value / totalScore) * 100) : 0;
  const youPercent = percent(scores.you);
  const otherPercent = percent(scores.other);
  const sharedPercent = Math.max(0, 100 - youPercent - otherPercent);
  const peopleBalance = peopleScore ? Math.round((scores.you / peopleScore) * 100) : 0;
  const relativeDifference = peopleScore ? (Math.abs(scores.you - scores.other) / peopleScore) * 100 : 0;
  const status = !activeTasks.length
    ? "Ainda sem divisão"
    : !scores.other
      ? "Ainda falta dividir com outra pessoa"
      : relativeDifference <= 10
        ? "Bem equilibrada"
        : relativeDifference <= 25
          ? "Um pouco desequilibrada"
          : "Mais concentrada";

  const selectedArea = household.areas.find((area) => area.id === selectedAreaId) ?? null;
  const selectedAreaTasks = selectedArea ? tasks.filter((task) => task.areaId === selectedArea.id && !task.archived) : [];
  const recentActivity = tasks
    .filter((task) => task.completed && !task.archived)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 3);

  const closeArea = () => setSelectedAreaId(null);
  const updateTaskForm = (changes: Partial<TaskForm>) => setTaskForm((current) => current ? { ...current, ...changes } : current);

  const archive = async () => {
    if (!confirmTask) return;
    const response = await fetch(apiTasks, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: confirmTask, action: "archive" }) });
    if (response.ok) setTasks((current) => current.map((task) => task.id === confirmTask ? { ...task, archived: true } : task));
    setConfirmTask(null);
  };

  const openEdit = (task: MockTask) => {
    setFormError("");
    setTaskForm({ mode: "edit", taskId: task.id, name: task.name, areaId: task.areaId, responsibility: task.responsibility, recurrence: task.recurrence, load: task.load });
  };

  const saveTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskForm) return;
    setFormError("");
    const body = { name: taskForm.name, areaId: taskForm.areaId, responsibility: taskForm.responsibility, recurrence: taskForm.recurrence, load: taskForm.load };
    const response = await fetch(apiTasks, {
      method: taskForm.mode === "add" ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(taskForm.mode === "add" ? body : { ...body, taskId: taskForm.taskId, action: "edit" })
    });
    const data = await response.json();
    if (!response.ok) { setFormError(data.error ?? "Não foi possível salvar a tarefa."); return; }
    if (taskForm.mode === "add") setTasks((current) => [...current, data.task]);
    else setTasks((current) => current.map((task) => task.id === taskForm.taskId ? data.task : task));
    setTaskForm(null);
  };

  return <main className="nos-shell">
    <div className="topbar"><a className="brand-lockup" href="/today" aria-label="Voltar para Hoje"><span className="brand-mark">⌂</span><span>cuidam</span></a><a className="top-link" href="/today">Hoje</a></div>
    <section className="nos-content">
      <p className="eyebrow">Nós · {household.name}</p>
      <h1>Como a casa está funcionando?</h1>
      <p className="lead">Aqui vocês enxergam responsabilidades, não quem está “ganhando”.</p>
      <div className="nos-layout">
        <div className="nos-balance-panel">
          <div className="balance-card">
            <div className="balance-header">
              <div><span className="meta-label">Divisão atual</span><strong>{status}</strong></div>
              <span className="balance-number-wrap"><small>{scores.other ? "Sua parte" : "No total"}</small><span className="balance-number">{totalScore ? `${scores.other ? peopleBalance : youPercent}%` : "—"}</span></span>
            </div>
            <div className="balance-bar" role="img" aria-label={`Você ${youPercent} por cento, outra pessoa ${otherPercent} por cento, compartilhadas ${sharedPercent} por cento`}><span className="balance-you" style={{ width: `${youPercent}%` }} /><span className="balance-other" style={{ width: `${otherPercent}%` }} /><i className="balance-shared" style={{ width: `${sharedPercent}%` }} /></div>
            <div className="balance-legend"><span>Você · {youPercent}%</span><span>Outra pessoa · {otherPercent}%</span><span>Compartilhadas · {sharedPercent}%</span></div>
            <p>A divisão considera o peso e a frequência. Tarefas compartilhadas ficam visíveis sem pesar contra uma pessoa.</p>
          </div>
        </div>
        <div className="nos-areas-panel">
          <div className="section-heading"><h2>Áreas da casa</h2><span>{household.areas.length} áreas</span></div>
          <div className="nos-area-list">
            {household.areas.map((area) => {
              const areaTasks = tasks.filter((task) => task.areaId === area.id && !task.archived);
              const owners = Array.from(new Set(areaTasks.map((task) => responsibilityLabel(task.responsibility))));
              return <article className="nos-area" key={area.id}>
                <button className="nos-area-button" onClick={() => setSelectedAreaId(area.id)} aria-label={`Ver tarefas da área ${area.name}`}>
                  <span className="area-icon">{area.icon}</span>
                  <span><strong>{area.name}</strong><small>{owners.length ? `${owners.length > 1 ? "Responsáveis" : "Responsável"}: ${owners.join(" · ")}` : "Ainda sem tarefas"}</small></span>
                  <span className="area-count" aria-label={`${areaTasks.length} tarefas`}>{areaTasks.length}</span><b aria-hidden="true">›</b>
                </button>
              </article>;
            })}
          </div>
          <section className="nos-activity-panel" aria-labelledby="activity-title">
            <div className="section-heading"><h2 id="activity-title">Atividade recente</h2><span>Últimas ações</span></div>
            <div className="nos-activity-card">
              {recentActivity.length ? recentActivity.map((task) => <div className="nos-activity-row" key={task.id}><span className="activity-icon" aria-hidden="true">✓</span><span><strong>{task.name}</strong><small>{household.areas.find((area) => area.id === task.areaId)?.name ?? "Casa"} · ocorrência concluída</small></span></div>) : <p className="area-empty">As conclusões e mudanças da casa aparecerão aqui.</p>}
            </div>
          </section>
        </div>
      </div>
    </section>

    {selectedArea && <div className="nos-drawer-layer">
      <button className="nos-drawer-backdrop" aria-label="Fechar detalhes da área" onClick={closeArea} />
      <aside className="nos-area-drawer" role="dialog" aria-modal="true" aria-labelledby="area-drawer-title">
        <header className="nos-drawer-header"><div><span className="drawer-kicker">Área da casa</span><h2 id="area-drawer-title">{selectedArea.icon} {selectedArea.name}</h2><p>{selectedAreaTasks.length} {selectedAreaTasks.length === 1 ? "tarefa" : "tarefas"} na rotina</p></div><button className="drawer-close" onClick={closeArea} aria-label="Fechar área">×</button></header>
        <div className="nos-drawer-body">
          {selectedAreaTasks.length ? <div className="nos-drawer-task-list">{selectedAreaTasks.map((task) => <div className="nos-drawer-task" key={task.id}><div><strong>{task.name}</strong><small>{task.recurrence} · carga {task.load}{task.completed ? " · concluída" : ""}</small></div><div className="nos-drawer-task-actions"><em>{responsibilityLabel(task.responsibility)}</em><button className="task-edit" onClick={() => openEdit(task)}>Editar</button><button className="task-remove" onClick={() => setConfirmTask(task.id)} aria-label={`Remover ${task.name}`}>×</button></div></div>)}</div> : <p className="area-empty drawer-empty">Ainda não tem tarefas aqui.</p>}
        </div>
        <footer className="nos-drawer-footer"><button className="button primary" onClick={() => { setFormError(""); setTaskForm(blankTaskForm(selectedArea.id)); }}>Adicionar tarefa</button></footer>
      </aside>
    </div>}

    {taskForm && <div className="modal-backdrop task-form-backdrop"><section className="task-form-modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title"><div className="task-form-heading"><div><span className="drawer-kicker">{taskForm.mode === "add" ? "Nova responsabilidade" : "Editar responsabilidade"}</span><h2 id="task-form-title">{taskForm.mode === "add" ? "O que precisa acontecer?" : "Ajustar tarefa"}</h2></div><button className="drawer-close" type="button" onClick={() => setTaskForm(null)} aria-label="Fechar formulário">×</button></div><form onSubmit={saveTask}><label>Nome da tarefa<input value={taskForm.name} onChange={(event) => updateTaskForm({ name: event.target.value })} placeholder="Ex.: Limpar bancada" required /></label><label>Área<select value={taskForm.areaId} onChange={(event) => updateTaskForm({ areaId: event.target.value })}>{household.areas.map((area) => <option value={area.id} key={area.id}>{area.icon} {area.name}</option>)}</select></label><label>Responsabilidade<select value={taskForm.responsibility} onChange={(event) => updateTaskForm({ responsibility: event.target.value as MockResponsibility })}><option>Você</option><option>Outra pessoa</option><option>Nós</option></select></label><label>Frequência<select value={taskForm.recurrence} onChange={(event) => updateTaskForm({ recurrence: event.target.value })}>{recurrenceOptions.map((option) => <option key={option}>{option}</option>)}</select></label><fieldset className="load-dots"><legend>Carga <span>{taskForm.load} de 5</span></legend><div>{[1, 2, 3, 4, 5].map((value) => <button type="button" className={value <= taskForm.load ? "selected" : ""} aria-label={`Carga ${value} de 5`} aria-pressed={value === taskForm.load} onClick={() => updateTaskForm({ load: value })} key={value} />)}</div></fieldset>{formError && <p className="form-error">{formError}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setTaskForm(null)}>Cancelar</button><button className="button primary">{taskForm.mode === "add" ? "Adicionar" : "Salvar"}</button></div></form></section></div>}

    {confirmTask && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-title"><span className="confirm-icon">−</span><h2 id="remove-title">Remover da rotina?</h2><p>Essa tarefa deixa de aparecer no dia a dia, mas o histórico continua preservado.</p><div><button className="button secondary" onClick={() => setConfirmTask(null)}>Cancelar</button><button className="button danger-button" onClick={archive}>Remover tarefa</button></div></section></div>}
    <nav className="bottom-nav"><a href="/today"><b>☀️</b>Hoje</a><a className="active" href="/nos"><b>🤝</b>Nós</a><a href="/casa"><b>🏡</b>Casa</a></nav>
  </main>;
}
