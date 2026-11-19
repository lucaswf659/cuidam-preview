import { AppChrome, type AppSection } from "@/components/app-chrome";
import styles from "./app-page-loading.module.css";

type PageLoadingKind = "today" | "nos" | "casa" | "rewards";

const pageDetails: Record<PageLoadingKind, { section: AppSection; label: string; shell: string; content: string }> = {
  today: { section: "today", label: "Hoje", shell: "today-shell", content: "today-content" },
  nos: { section: "nos", label: "Nós", shell: "nos-shell", content: "nos-content" },
  casa: { section: "casa", label: "Configurações", shell: "casa-shell", content: "casa-content" },
  rewards: { section: "rewards", label: "Recompensas", shell: "rewards-shell", content: "rewards-content" }
};

function Placeholder({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`${styles.placeholder} ${className}`} />;
}

export function AppPageLoading({ kind }: { kind: PageLoadingKind }) {
  const page = pageDetails[kind];

  return <main className={page.shell} aria-busy="true">
    <AppChrome current={page.section} />
    <section className={`${page.content} ${styles.loadingContent}`}>
      <span className={styles.status} role="status">Carregando {page.label.toLocaleLowerCase("pt-BR")}…</span>
      <div className={styles.heading} aria-hidden="true">
        <Placeholder className={styles.eyebrow} />
        <Placeholder className={styles.title} />
        <Placeholder className={styles.description} />
      </div>

      {kind === "today" && <>
        <Placeholder className={`${styles.panel} ${styles.progressPanel}`} />
        <div className={styles.taskList} aria-hidden="true">
          {[0, 1, 2].map((item) => <div className={styles.taskRow} key={item}><Placeholder className={styles.icon} /><Placeholder className={styles.taskText} /><Placeholder className={styles.button} /></div>)}
        </div>
      </>}

      {kind === "nos" && <>
        <Placeholder className={`${styles.panel} ${styles.summaryPanel}`} />
        <div className={styles.twoColumns} aria-hidden="true">
          {[0, 1].map((item) => <div className={styles.panel} key={item}><Placeholder className={styles.panelHeading} /><Placeholder className={styles.taskText} /><Placeholder className={styles.taskText} /></div>)}
        </div>
      </>}

      {kind === "casa" && <>
        <div className={styles.twoColumns} aria-hidden="true">
          {[0, 1].map((item) => <Placeholder className={`${styles.panel} ${styles.peoplePanel}`} key={item} />)}
        </div>
        <div className={styles.areaList} aria-hidden="true">
          {[0, 1, 2, 3].map((item) => <div className={styles.taskRow} key={item}><Placeholder className={styles.icon} /><Placeholder className={styles.taskText} /><Placeholder className={styles.button} /></div>)}
        </div>
      </>}

      {kind === "rewards" && <>
        <Placeholder className={`${styles.panel} ${styles.balancePanel}`} />
        <div className={styles.rewardGrid} aria-hidden="true">
          {[0, 1, 2].map((item) => <div className={styles.panel} key={item}><Placeholder className={styles.icon} /><Placeholder className={styles.taskText} /><Placeholder className={styles.button} /></div>)}
        </div>
      </>}
    </section>
  </main>;
}
