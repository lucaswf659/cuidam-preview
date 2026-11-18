"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MockHousehold, MockResponsibility } from "@/lib/mock/store";
import { AppChrome } from "@/components/app-chrome";
import { AreaIcon } from "@/components/area-icon";
import styles from "@/components/nos-overview.module.css";

function responsibilityLabel(responsibility: MockResponsibility) {
  return responsibility === "Nós" ? "Compartilhada" : responsibility;
}

export function NosMock({ household }: { household: MockHousehold }) {
  const searchParams = useSearchParams();
  const areaFromQuery = searchParams.get("area");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (areaFromQuery && household.areas.some((area) => area.id === areaFromQuery)) setSelectedAreaId(areaFromQuery);
  }, [areaFromQuery, household.areas]);

  const selectedArea = household.areas.find((area) => area.id === selectedAreaId) ?? null;
  const selectedAreaTasks = selectedArea ? household.tasks.filter((task) => task.areaId === selectedArea.id && !task.archived) : [];

  const closeArea = () => setSelectedAreaId(null);

  return <main className="nos-shell">
    <AppChrome current="nos" />
    <section className={`nos-content ${styles.content}`}>
      <p className="eyebrow">Nós · {household.name}</p>
      <h1>Quem cuida do quê?</h1>
      <p className="lead">Veja as responsabilidades por área e o que é compartilhado.</p>
      <div className="nos-layout">
        <div className="nos-areas-panel">
          <div className="section-heading"><h2>Responsabilidades por área</h2><span>{household.areas.length} áreas</span></div>
          <div className="nos-area-list">
            {household.areas.map((area) => {
              const areaTasks = household.tasks.filter((task) => task.areaId === area.id && !task.archived);
              const owners = Array.from(new Set(areaTasks.map((task) => responsibilityLabel(task.responsibility))));
              return <article className="nos-area" key={area.id}>
                <button className="nos-area-button" onClick={() => setSelectedAreaId(area.id)} aria-label={`Ver tarefas da área ${area.name}`}>
                  <AreaIcon name={area.name || area.id} fallback={area.icon} className="area-icon" />
                  <span><strong>{area.name}</strong><small>{owners.length ? `${owners.length > 1 ? "Responsáveis" : "Responsável"}: ${owners.join(" · ")}` : "Ainda sem tarefas"}</small></span>
                  <span className="nos-area-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m9 5 7 7-7 7" /></svg></span>
                </button>
              </article>;
            })}
          </div>
        </div>
      </div>
    </section>

    {selectedArea && <div className="nos-drawer-layer">
      <button className="nos-drawer-backdrop" aria-label="Fechar detalhes da área" onClick={closeArea} />
      <aside className="nos-area-drawer" role="dialog" aria-modal="true" aria-labelledby="area-drawer-title">
        <header className="nos-drawer-header"><div><span className="drawer-kicker">Área da casa</span><h2 id="area-drawer-title"><AreaIcon name={selectedArea.name || selectedArea.id} fallback={selectedArea.icon} className="area-icon-inline" /> {selectedArea.name}</h2><p>{selectedAreaTasks.length} {selectedAreaTasks.length === 1 ? "tarefa" : "tarefas"} na rotina</p></div><button className="drawer-close" onClick={closeArea} aria-label="Fechar área">×</button></header>
        <div className="nos-drawer-body">
          {selectedAreaTasks.length ? <div className="nos-drawer-task-list">{selectedAreaTasks.map((task) => <div className="nos-drawer-task" key={task.id}><div><strong>{task.name}</strong><small>{task.recurrence}{task.completed ? " · concluída" : ""}</small></div><div className="nos-drawer-task-actions"><em>{responsibilityLabel(task.responsibility)}</em></div></div>)}</div> : <p className="area-empty drawer-empty">Ainda não tem tarefas nesta área.</p>}
        </div>
      </aside>
    </div>}
  </main>;
}
