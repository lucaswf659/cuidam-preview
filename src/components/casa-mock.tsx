"use client";

import { FormEvent, useState } from "react";
import type { HouseholdInvitation, HouseholdPerson, MockArea, MockHousehold, MockResponsibility, MockTask } from "@/lib/mock/store";
import { AppChrome } from "@/components/app-chrome";
import { AreaIcon } from "@/components/area-icon";
import styles from "@/components/casa-settings.module.css";
import effortStyles from "@/components/task-effort.module.css";
import { DEFAULT_TASK_LOAD } from "@/lib/task-load";

type AreaForm = { mode: "add" | "edit"; areaId?: string; name: string; icon: string };
const apiAreas = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/areas" : "/api/mock/areas";
const apiTasks = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/tasks" : "/api/mock/tasks";
const apiInvite = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/invite" : "/api/mock/invite";
const mockMode = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";
const recurrenceOptions = ["Diária", "Semanal", "3× por semana", "Mensal"];
type TaskForm = { mode: "add" | "edit"; taskId?: string; areaId: string; name: string; responsibility: MockResponsibility; recurrence: string; load: number };
const areaIconChoices = [
  { icon: "🏡", label: "Casa" },
  { icon: "🍳", label: "Cozinha", areaName: "Cozinha" },
  { icon: "🛋️", label: "Sala", areaName: "Sala" },
  { icon: "🛏️", label: "Quarto", areaName: "Quartos" },
  { icon: "🫧", label: "Banheiro", areaName: "Banheiro" },
  { icon: "💻", label: "Escritório", areaName: "Escritório" },
  { icon: "🐾", label: "Pets", areaName: "Pets" },
  { icon: "🧺", label: "Lavanderia" },
  { icon: "🪴", label: "Plantas" },
  { icon: "🚪", label: "Entrada" },
  { icon: "🧹", label: "Limpeza" },
  { icon: "🧰", label: "Reparos" }
];

export function CasaMock({ household }: { household: MockHousehold }) {
  const [areas, setAreas] = useState(household.areas);
  const [tasks, setTasks] = useState(household.tasks);
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>(household.invitations ?? (household.inviteEmail ? [{ id: "mock-pending-invite", email: household.inviteEmail, expiresAt: "" }] : []));
  const [inviteEmail, setInviteEmail] = useState(household.inviteEmail ?? "");
  const [message, setMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [areaForm, setAreaForm] = useState<AreaForm | null>(null);
  const [confirmArea, setConfirmArea] = useState<MockArea | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leavePending, setLeavePending] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [areaError, setAreaError] = useState("");
  const [areaManagerError, setAreaManagerError] = useState("");
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null);
  const [taskError, setTaskError] = useState("");
  const [confirmTask, setConfirmTask] = useState<MockTask | null>(null);
  const members: HouseholdPerson[] = household.members ?? [{ id: "current-member", name: household.ownerName, email: household.ownerEmail, current: true }];
  const memberCount = household.memberCount ?? members.length;

  const openCreateArea = () => { setAreaError(""); setAreaForm({ mode: "add", name: "", icon: "🏡" }); };
  const openEditArea = (area: MockArea) => { setAreaError(""); setAreaForm({ mode: "edit", areaId: area.id, name: area.name, icon: area.icon }); };
  const updateAreaForm = (changes: Partial<AreaForm>) => setAreaForm((current) => current ? { ...current, ...changes } : current);
  const updateTaskForm = (changes: Partial<TaskForm>) => setTaskForm((current) => current ? { ...current, ...changes } : current);
  const openAddTask = (areaId: string) => { setTaskError(""); setTaskForm({ mode: "add", areaId, name: "", responsibility: "Você", recurrence: "Diária", load: DEFAULT_TASK_LOAD }); };
  const openEditTask = (task: MockTask) => { setTaskError(""); setTaskForm({ mode: "edit", taskId: task.id, areaId: task.areaId, name: task.name, responsibility: task.responsibility, recurrence: task.recurrence, load: task.load }); };

  const saveTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskForm) return;
    setTaskError("");
    const payload = { name: taskForm.name, areaId: taskForm.areaId, responsibility: taskForm.responsibility, recurrence: taskForm.recurrence, ...(taskForm.mode === "edit" ? { load: taskForm.load } : {}) };
    const response = await fetch(apiTasks, { method: taskForm.mode === "add" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(taskForm.mode === "add" ? payload : { ...payload, taskId: taskForm.taskId, action: "edit" }) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.task) { setTaskError(data?.error ?? "Não foi possível salvar a tarefa."); return; }
    if (taskForm.mode === "add") setTasks((current) => [...current, data.task as MockTask]);
    else setTasks((current) => current.map((task) => task.id === taskForm.taskId ? data.task as MockTask : task));
    setOpenArea(taskForm.areaId);
    setTaskForm(null);
  };

  const archiveTask = async () => {
    if (!confirmTask) return;
    setTaskError("");
    const response = await fetch(apiTasks, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: confirmTask.id, action: "archive" }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setTaskError(data?.error ?? "Não foi possível remover a tarefa da rotina."); setConfirmTask(null); return; }
    setTasks((current) => current.map((task) => task.id === confirmTask.id ? { ...task, archived: true } : task));
    setConfirmTask(null);
  };

  const saveArea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!areaForm) return;
    setAreaError("");
    const response = await fetch(apiAreas, { method: areaForm.mode === "add" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(areaForm.mode === "add" ? { name: areaForm.name, icon: areaForm.icon } : { areaId: areaForm.areaId, name: areaForm.name, icon: areaForm.icon }) });
    const data = await response.json();
    if (!response.ok) { setAreaError(data.error ?? "Não foi possível salvar a área."); return; }
    if (areaForm.mode === "add") setAreas((current) => [...current, data.area]);
    else setAreas((current) => current.map((area) => area.id === areaForm.areaId ? data.area : area));
    setAreaForm(null);
  };

  const moveArea = async (areaId: string, direction: -1 | 1) => {
    setAreaManagerError("");
    const index = areas.findIndex((area) => area.id === areaId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= areas.length) return;
    const reorderedAreas = [...areas];
    [reorderedAreas[index], reorderedAreas[nextIndex]] = [reorderedAreas[nextIndex], reorderedAreas[index]];
    try {
      const response = await fetch(apiAreas, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reorder", areaIds: reorderedAreas.map((area) => area.id) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível reorganizar as áreas.");
      setAreas(data.areas as MockArea[]);
    } catch (cause) {
      setAreaManagerError(cause instanceof Error ? cause.message : "Não foi possível reorganizar as áreas.");
    }
  };

  const archiveArea = async () => {
    if (!confirmArea) return;
    setAreaManagerError("");
    try {
      const response = await fetch(apiAreas, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive", areaId: confirmArea.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível arquivar a área.");
      setAreas((current) => current.filter((area) => area.id !== confirmArea.id));
      if (openArea === confirmArea.id) setOpenArea(null);
      setConfirmArea(null);
    } catch (cause) {
      setAreaManagerError(cause instanceof Error ? cause.message : "Não foi possível arquivar a área.");
      setConfirmArea(null);
    }
  };

  const sendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setInviteError("");
    if (!inviteEmail.trim()) { setInviteError("Informe um e-mail para criar o convite."); return; }
    setInvitePending(true);
    try {
      const response = await fetch(apiInvite, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setInviteError(data?.error ?? "Não foi possível criar o convite."); return; }
      if (typeof data?.inviteUrl !== "string") { setInviteError("O convite foi registrado, mas não recebemos um link para compartilhar."); return; }
      const link = new URL(data.inviteUrl, window.location.origin);
      if (link.origin !== window.location.origin || !link.pathname.startsWith("/convite/")) {
        setInviteError("O link recebido não é válido para esta casa.");
        return;
      }
      setInviteUrl(link.toString());
      if (data.invitation && typeof data.invitation.id === "string" && typeof data.invitation.email === "string") {
        setInvitations([{ id: data.invitation.id, email: data.invitation.email, expiresAt: String(data.invitation.expiresAt ?? "") }]);
      }
      setMessage(mockMode ? "Link de demonstração pronto. Nenhum e-mail foi enviado." : "Link do convite pronto para copiar. Nenhum e-mail foi enviado.");
    } catch {
      setInviteError("Não foi possível criar o convite. Confira sua conexão e tente novamente.");
    } finally {
      setInvitePending(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    setInviteError(""); setMessage("");
    try {
      const response = await fetch(apiInvite, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ invitationId }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível cancelar o convite.");
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      setInviteUrl(""); setMessage("Convite cancelado.");
    } catch (cause) {
      setInviteError(cause instanceof Error ? cause.message : "Não foi possível cancelar o convite.");
    }
  };

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteError("");
      setMessage("Link copiado.");
    } catch {
      setInviteError("Não foi possível copiar automaticamente. Selecione o link acima para copiá-lo.");
    }
  };

  const leaveHousehold = async () => {
    setLeaveError("");
    setLeavePending(true);
    try {
      const response = await fetch("/api/household/leave", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível sair desta casa.");
      window.location.assign("/entrar?mode=login");
    } catch (cause) {
      setLeaveError(cause instanceof Error ? cause.message : "Não foi possível sair desta casa.");
      setLeavePending(false);
    }
  };

  return <main className="casa-shell">
    <AppChrome current="casa" />
    <section className={`casa-content ${styles.content}`}>
      <div className="casa-heading"><p className="eyebrow">Casa</p><h1>{household.name}</h1><p className="lead">Um lugar simples para ajustar como vocês cuidam da casa.</p></div>
      <section className="casa-people-panel" aria-labelledby="people-title">
        <div className="section-heading casa-section-heading"><div><h2 id="people-title">Pessoas</h2><span>{memberCount} de 2 pessoas na casa</span></div></div>
        <div className="casa-card casa-people-card">
          <div className="casa-people-list">{members.map((person) => <div className="casa-person-row" key={person.id}><span className="casa-person-avatar" aria-hidden="true">{person.name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "•"}</span><span><b>{person.name}</b><small>{person.current ? "Você" : "Membro da casa"}{person.email ? ` · ${person.email}` : ""}</small></span><span className="casa-person-status">Na casa</span></div>)}</div>
          {invitations.map((invitation) => <div className="casa-invitation-row" key={invitation.id}><span className="casa-invitation-icon" aria-hidden="true">✉</span><span><b>{invitation.email}</b><small>Convite aguardando resposta</small></span><button className="casa-invitation-cancel" type="button" onClick={() => void cancelInvitation(invitation.id)}>Cancelar</button></div>)}
          {!invitations.length && memberCount < 2 && <p className="casa-people-hint">Convide alguém quando quiser dividir a casa.</p>}
          {memberCount >= 2 && <p className="casa-people-hint">Esta casa já tem as duas pessoas previstas no MVP.</p>}
        </div>
        <div className="casa-share-panel"><div className="section-heading casa-invite-heading"><h3>Compartilhar a casa</h3></div><form className="casa-card casa-invite-card" onSubmit={sendInvite}><p>Gere um link para a outra pessoa entrar direto nesta casa. Nenhum e-mail será enviado.</p><label>E-mail<input type="email" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteUrl(""); setMessage(""); setInviteError(""); }} placeholder="alguem@email.com" required disabled={memberCount >= 2} /></label>{inviteError && <small className="form-error" role="alert">{inviteError}</small>}{message && <small className="form-success" role="status">{message}</small>}{inviteUrl && <><label>Link do convite<input aria-label="Link do convite" type="text" className="invite-link-input" value={inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label><button className="button secondary" type="button" onClick={copyInviteLink}>Copiar link</button></>}{memberCount < 2 && <button className="button primary" type="submit" disabled={invitePending}>{invitePending ? "Gerando link…" : inviteUrl ? "Gerar outro link" : mockMode ? "Gerar link de teste" : "Gerar link do convite"}</button>}</form></div>
      </section>
      {!mockMode && <section className="casa-leave-panel" aria-labelledby="leave-house-title">
        <div><h2 id="leave-house-title">Sair desta casa</h2><p>A casa continua ativa se alguém permanecer. Se você sair por último, ela será desativada, mas o histórico ficará guardado para uma possível reabertura.</p></div>
        {leaveError && <p className="form-error" role="alert">{leaveError}</p>}
        <button className="button secondary casa-leave-button" type="button" onClick={() => { setLeaveError(""); setConfirmLeave(true); }}>Sair da casa</button>
      </section>}
      <div className="casa-areas-panel">
        <div className="section-heading casa-section-heading"><div><h2>Áreas da casa</h2><span>{areas.length} áreas</span></div><button className="button secondary compact-button" onClick={openCreateArea}>Adicionar área</button></div>
        {areaManagerError && <p className="form-error" role="alert">{areaManagerError}</p>}
        <div className="settings-list">{areas.length ? areas.map((area, index) => {
          const isOpen = openArea === area.id;
          const areaTasks = tasks.filter((task) => task.areaId === area.id && !task.archived);
          return <div className="settings-group" key={area.id}>
            <div className="settings-row"><AreaIcon name={area.name || area.id} fallback={area.icon} className="settings-icon" /><span className="settings-copy"><b>{area.name}</b><small>Área ativa · {areaTasks.length} {areaTasks.length === 1 ? "tarefa" : "tarefas"}</small></span><button className="area-edit-button" type="button" onClick={() => openEditArea(area)}>Editar área</button><button className="settings-row-button settings-expand-button" onClick={() => setOpenArea(isOpen ? null : area.id)} aria-label={`${isOpen ? "Fechar" : "Gerenciar"} ${area.name}`} aria-expanded={isOpen}><span className={`settings-chevron ${isOpen ? "open" : ""}`} aria-hidden="true">›</span></button></div>
            {isOpen && <div className={styles.areaManagement}>
              <div className={styles.areaActions}><span className={styles.orderHeading}>Organizar esta área</span><button className={styles.orderButton} type="button" disabled={index === 0} aria-label={`Mover ${area.name} para cima`} onClick={() => void moveArea(area.id, -1)}>↑ <span>Mover para cima</span></button><button className={styles.orderButton} type="button" disabled={index === areas.length - 1} aria-label={`Mover ${area.name} para baixo`} onClick={() => void moveArea(area.id, 1)}>↓ <span>Mover para baixo</span></button><button className={styles.archiveButton} type="button" onClick={() => setConfirmArea(area)}>Arquivar área</button></div>
              <div className={styles.taskManagement}>
                <div className={styles.taskHeading}><div><strong>Tarefas desta área</strong><small>Defina o que precisa acontecer e quem cuida.</small></div><button type="button" className="button secondary compact-button" onClick={() => openAddTask(area.id)}>Adicionar tarefa</button></div>
                {areaTasks.length ? <div className={styles.areaTaskList}>{areaTasks.map((task) => <div className={styles.areaTaskRow} role="group" aria-label={`Tarefa ${task.name}`} key={task.id}><span><strong>{task.name}</strong><small>{task.recurrence} · {task.responsibility === "Nós" ? "Compartilhada" : task.responsibility}</small></span><div><button type="button" className={styles.taskEditButton} onClick={() => openEditTask(task)}>Editar</button><button type="button" className={styles.taskArchiveButton} aria-label={`Remover ${task.name} da rotina`} onClick={() => setConfirmTask(task)}>Remover</button></div></div>)}</div> : <p className={styles.noTasks}>Ainda não há tarefas nesta área.</p>}
                {taskError && openArea === area.id && <p role="alert" className="form-error">{taskError}</p>}
              </div>
            </div>}
          </div>;
        }) : <p className="area-empty casa-area-empty">Ainda não há áreas. Adicione uma quando fizer sentido para a casa.</p>}</div>
      </div>
    </section>

    {areaForm && <div className="modal-backdrop"><section className="task-form-modal area-form-modal" role="dialog" aria-modal="true" aria-labelledby="area-form-title"><div className="task-form-heading"><div><span className="drawer-kicker">{areaForm.mode === "add" ? "Nova área" : "Editar área"}</span><h2 id="area-form-title">Como chamar esse espaço?</h2></div><button className="drawer-close" type="button" onClick={() => setAreaForm(null)} aria-label="Fechar formulário">×</button></div><form onSubmit={saveArea}><label>Nome da área<input value={areaForm.name} onChange={(event) => updateAreaForm({ name: event.target.value })} placeholder="Ex.: Varanda" required /></label><div className={styles.iconPicker}><span className={styles.iconPickerLabel}>Escolha um ícone</span><div className={styles.iconChoices} role="group" aria-label="Ícone da área">{areaIconChoices.map((choice) => <button className={styles.iconChoice} key={choice.icon} type="button" aria-label={choice.label} aria-pressed={areaForm.icon === choice.icon} title={choice.label} onClick={() => updateAreaForm({ icon: choice.icon })}><AreaIcon name={choice.areaName ?? choice.label} fallback={choice.icon} className={styles.iconPreview} /><small>{choice.label}</small></button>)}</div></div>{areaError && <p className="form-error">{areaError}</p>}<div className="form-actions"><button className="button secondary" type="button" onClick={() => setAreaForm(null)}>Cancelar</button><button className="button primary" type="submit">{areaForm.mode === "add" ? "Adicionar área" : "Salvar"}</button></div></form></section></div>}
    {taskForm && <div className="modal-backdrop task-form-backdrop"><section className="task-form-modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title"><div className="task-form-heading"><div><span className="drawer-kicker">{taskForm.mode === "add" ? "Nova tarefa" : "Editar tarefa"}</span><h2 id="task-form-title">O que precisa acontecer?</h2></div><button className="drawer-close" type="button" onClick={() => setTaskForm(null)} aria-label="Fechar formulário">×</button></div><form onSubmit={saveTask}><label>Nome da tarefa<input value={taskForm.name} onChange={(event) => updateTaskForm({ name: event.target.value })} placeholder="Ex.: Limpar bancada" required /></label><label>Área<select value={taskForm.areaId} onChange={(event) => updateTaskForm({ areaId: event.target.value })}>{areas.map((area) => <option value={area.id} key={area.id}>{area.icon} {area.name}</option>)}</select></label><label>Responsabilidade<select value={taskForm.responsibility} onChange={(event) => updateTaskForm({ responsibility: event.target.value as MockResponsibility })}><option>Você</option><option>Outra pessoa</option><option>Nós</option></select></label><label>Frequência<select value={taskForm.recurrence} onChange={(event) => updateTaskForm({ recurrence: event.target.value })}>{recurrenceOptions.map((option) => <option key={option}>{option}</option>)}</select></label>{taskForm.mode === "edit" && <details className={effortStyles.details}><summary>Ajustar esforço da tarefa</summary><p>A gente sugere o esforço para a rotina começar pronta. Ajuste se esta tarefa tiver um esforço diferente na sua casa. Isso define as estrelas recebidas ao concluir.</p><fieldset><legend>Esforço estimado <span>{taskForm.load} de 5</span></legend><div className={effortStyles.choices}>{[1, 2, 3, 4, 5].map((value) => <button type="button" className={value <= taskForm.load ? effortStyles.selected : ""} aria-label={`Esforço estimado ${value} de 5`} aria-pressed={value === taskForm.load} onClick={() => updateTaskForm({ load: value })} key={value} />)}</div></fieldset></details>}{taskError && <p className="form-error" role="alert">{taskError}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setTaskForm(null)}>Cancelar</button><button className="button primary" type="submit">{taskForm.mode === "add" ? "Adicionar tarefa" : "Salvar"}</button></div></form></section></div>}
    {confirmTask && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-task-title"><span className="confirm-icon">−</span><h2 id="remove-task-title">Remover da rotina?</h2><p>“{confirmTask.name}” deixa de aparecer no dia a dia, mas o histórico continua guardado.</p><div><button className="button secondary" onClick={() => setConfirmTask(null)}>Cancelar</button><button className="button danger-button" onClick={() => void archiveTask()}>Remover tarefa</button></div></section></div>}
    {confirmArea && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="archive-area-title"><span className="confirm-icon">−</span><h2 id="archive-area-title">Arquivar {confirmArea.name}?</h2><p>As tarefas ativas dessa área também saem da rotina. O histórico delas continua guardado.</p><div><button className="button secondary" onClick={() => setConfirmArea(null)}>Voltar</button><button className="button danger-button" onClick={() => void archiveArea()}>Arquivar área</button></div></section></div>}
    {confirmLeave && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-house-confirm-title"><span className="confirm-icon">↗</span><h2 id="leave-house-confirm-title">Sair de {household.name}?</h2><p>Você perderá acesso a esta casa. Se for a última pessoa, ela será desativada; os dados e o histórico ficam guardados e você poderá reabri-la depois. Para entrar em outra casa, abra novamente o link do convite.</p><div><button className="button secondary" type="button" disabled={leavePending} onClick={() => setConfirmLeave(false)}>Continuar na casa</button><button className="button danger-button" type="button" disabled={leavePending} onClick={() => void leaveHousehold()}>{leavePending ? "Saindo…" : "Sair da casa"}</button></div></section></div>}
  </main>;
}

