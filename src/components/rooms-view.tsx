"use client";

import { useMemo, useState } from "react";
import type { MockHousehold, MockTask } from "@/lib/mock/store";
import { AppChrome } from "@/components/app-chrome";
import { AreaIcon } from "@/components/area-icon";
import styles from "@/components/rooms-view.module.css";

const apiTasks = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/tasks" : "/api/mock/tasks";

export function RoomsView({ household }: { household: MockHousehold }) {
  const [tasksState, setTasksState] = useState(household.tasks);
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState("");
  const activeAreas = useMemo(() => [...household.areas].sort((a, b) => a.sortOrder - b.sortOrder), [household.areas]);
  const [selectedAreaId, setSelectedAreaId] = useState(() => {
    const firstWithTasks = activeAreas.find((area) => tasksState.some((task) => task.areaId === area.id && !task.archived));
    return firstWithTasks?.id ?? activeAreas[0]?.id ?? "";
  });
  const selectedArea = activeAreas.find((area) => area.id === selectedAreaId);
  const tasks = tasksState
    .filter((task) => task.areaId === selectedAreaId && !task.archived)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const otherPerson = household.members?.find((member) => !member.current);

  const transferTask = async (task: MockTask) => {
    setWorkingTaskId(task.id);
    setTransferMessage("");
    setTransferError("");
    try {
      const response = await fetch(apiTasks, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action: "transfer" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.task) throw new Error(data.error ?? "Não foi possível passar esta tarefa.");
      setTasksState((current) => current.map((item) => item.id === task.id ? data.task : item));
      setTransferMessage(`Responsabilidade passada para ${otherPerson?.name ?? "outra pessoa"}. Ela verá a atualização ao abrir o Cuidam.`);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Não foi possível passar esta tarefa.");
    } finally {
      setWorkingTaskId(null);
    }
  };

  return <main className={`rooms-shell ${styles.shell}`}>
    <AppChrome current="rooms" />
    <section className={`rooms-content ${styles.content}`}>
      <p className="eyebrow">Por cômodo · {household.name}</p>
      <h1>O que pode ser feito em cada espaço?</h1>
      <p className="lead">Escolha um cômodo para ver as responsabilidades da casa que acontecem ali.</p>

      {activeAreas.length ? <>
        <div className={styles.areaPicker} role="group" aria-label="Escolher cômodo">
          {activeAreas.map((area) => {
            const count = household.tasks.filter((task) => task.areaId === area.id && !task.archived).length;
            const selected = selectedAreaId === area.id;
            return <button
              type="button"
              key={area.id}
              className={`${styles.areaChoice}${selected ? ` ${styles.selected}` : ""}`}
              aria-pressed={selected}
              onClick={() => setSelectedAreaId(area.id)}
            >
              <AreaIcon name={area.name} fallback={area.icon} className={styles.areaIcon} />
              <span>{area.name}</span>
              <small>{count}</small>
            </button>;
          })}
        </div>

        {selectedArea && <section className={styles.taskPanel} aria-live="polite" aria-labelledby="room-task-title">
          <header className={styles.panelHeading}>
            <div className={styles.roomTitle}>
              <AreaIcon name={selectedArea.name} fallback={selectedArea.icon} className={styles.headingIcon} />
              <div><h2 id="room-task-title">{selectedArea.name}</h2><p>{tasks.length} {tasks.length === 1 ? "responsabilidade" : "responsabilidades"} neste espaço</p></div>
            </div>
          </header>
          {transferMessage && <p className={styles.transferMessage} role="status">{transferMessage}</p>}
          {transferError && <p className={styles.transferError} role="alert">{transferError}</p>}
          {tasks.length ? <ul className={styles.taskList}>
            {tasks.map((task) => <li key={task.id} className={styles.taskRow}>
              <span className={styles.taskDot} aria-hidden="true">✦</span>
              <div className={styles.taskDetails}><strong>{task.name}</strong><span>{task.recurrence}{task.dueDate ? ` · Prazo ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}` : ""} <i aria-hidden="true">·</i> {task.responsibility === "Nós" ? "Compartilhada" : task.responsibility === "Você" ? "Sua responsabilidade" : "Responsabilidade da outra pessoa"}</span></div>
              {task.responsibility === "Você" && household.memberCount > 1 && <button type="button" className={styles.transferButton} onClick={() => transferTask(task)} disabled={workingTaskId === task.id}>{workingTaskId === task.id ? "Passando…" : `Passar para ${otherPerson?.name ?? "outra pessoa"}`}</button>}
            </li>)}
          </ul> : <div className={styles.empty}>
            <span aria-hidden="true">🌿</span>
            <p>Ainda não há tarefas neste cômodo.</p>
            <small>Você pode adicionar uma pela ação no topo da tela.</small>
          </div>}
        </section>}
      </> : <div className={styles.empty}><span aria-hidden="true">🌿</span><p>Esta casa ainda não tem cômodos configurados.</p><small>Você pode criar áreas em Configurações.</small></div>}
    </section>
  </main>;
}
