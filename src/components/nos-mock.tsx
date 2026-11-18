import type { MockHousehold, MockResponsibility, MockTask } from "@/lib/mock/store";
import { AppChrome } from "@/components/app-chrome";
import { AreaIcon } from "@/components/area-icon";
import styles from "@/components/nos-overview.module.css";

function taskListFor(household: MockHousehold, responsibility: MockResponsibility) {
  const areaOrder = new Map(household.areas.map((area, index) => [area.id, index]));
  return household.tasks
    .filter((task) => !task.archived && task.responsibility === responsibility)
    .sort((a, b) => (areaOrder.get(a.areaId) ?? Number.MAX_SAFE_INTEGER) - (areaOrder.get(b.areaId) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, "pt-BR"));
}

function ResponsibilityGroup({
  id,
  title,
  description,
  tasks,
  household
}: {
  id: string;
  title: string;
  description: string;
  tasks: MockTask[];
  household: MockHousehold;
}) {
  const groupStyle = id === "shared" ? styles.sharedGroup : id === "other" ? styles.otherGroup : "";
  return <section className={`${styles.group} ${groupStyle}`} aria-labelledby={`${id}-title`}>
    <header className={styles.groupHeading}>
      <div><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div>
      <span className={styles.taskCount}>{tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}</span>
    </header>
    {tasks.length ? <ul className={styles.taskList}>
      {tasks.map((task) => {
        const area = household.areas.find((item) => item.id === task.areaId);
        return <li className={styles.taskRow} key={task.id}>
          <AreaIcon name={area?.name ?? task.areaId} fallback={area?.icon} className={styles.taskIcon} />
          <div className={styles.taskCopy}><strong>{task.name}</strong><span>{area?.name ?? "Área da casa"} <i aria-hidden="true">·</i> {task.recurrence}</span></div>
        </li>;
      })}
    </ul> : <p className={styles.emptyGroup}>Nenhuma tarefa nesta divisão por enquanto.</p>}
  </section>;
}

export function NosMock({ household }: { household: MockHousehold }) {
  const currentPerson = household.members?.find((member) => member.current)?.name || household.ownerName || "Você";
  const otherPerson = household.members?.find((member) => !member.current)?.name || "Outra pessoa";
  const personalTasks = taskListFor(household, "Você");
  const otherTasks = taskListFor(household, "Outra pessoa");
  const sharedTasks = taskListFor(household, "Nós");
  const showOtherPerson = household.memberCount > 1 || otherTasks.length > 0;

  return <main className="nos-shell">
    <AppChrome current="nos" />
    <section className={`nos-content ${styles.content}`}>
      <p className="eyebrow">Nós · {household.name}</p>
      <h1>Quem cuida do quê?</h1>
      <p className="lead">As tarefas ficam reunidas por responsabilidade, para ficar fácil ver o que está com cada pessoa.</p>
      <div className={styles.responsibilityGrid}>
        <ResponsibilityGroup id="you" title={`${currentPerson} cuida`} description={`Responsabilidade de ${currentPerson}`} tasks={personalTasks} household={household} />
        {showOtherPerson && <ResponsibilityGroup id="other" title={`${otherPerson} cuida`} description={`Responsabilidade de ${otherPerson}`} tasks={otherTasks} household={household} />}
        <ResponsibilityGroup id="shared" title="Vocês cuidam juntos" description="Responsabilidade compartilhada" tasks={sharedTasks} household={household} />
      </div>
    </section>
  </main>;
}
