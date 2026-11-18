import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

function CheckMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LeafMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 10C24 10 13 16 12 29c0 7 5 11 11 10 12-2 15-17 15-29Z" fill="currentColor" /><path d="M12 39c5-8 12-14 21-20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>;
}

const steps = [
  { number: "01", title: "Escolham o que faz parte da casa", copy: "Comecem por áreas e sugestões de responsabilidades. Fica só o que fizer sentido para vocês.", tone: "sage" },
  { number: "02", title: "Combinem quem cuida de cada parte", copy: "Definam responsabilidades, frequência e carga. A divisão pode ser ajustada quando a rotina mudar.", tone: "butter" },
  { number: "03", title: "Sigam um dia de cada vez", copy: "A tela Hoje mostra o que cabe no período, para a casa seguir funcionando sem alguém ter de lembrar por todos.", tone: "sky" },
];

const faqs = [
  { q: "Posso usar o Cuidam morando sozinho?", a: "Sim. Organize sua rotina por conta própria. Convidar alguém é opcional e você pode fazer isso depois, se fizer sentido." },
  { q: "O Cuidam serve só para tarefas diárias?", a: "Não. A rotina pode incluir responsabilidades diárias, semanais e mensais, em diferentes áreas da casa." },
  { q: "O app mostra quem faz mais?", a: "O Cuidam ajuda a enxergar como as responsabilidades estão distribuídas. Não há ranking nem competição." },
  { q: "O convite é enviado por e-mail?", a: "O Cuidam gera um link para você compartilhar por onde preferir. Nenhum e-mail é enviado automaticamente." },
];

export function MarketingHome() {
  return <main className="marketing-page">
    <header className="marketing-header">
      <div className="marketing-nav-wrap">
        <Link href="/" className="marketing-brand" aria-label="cuidam — página inicial">
          <span className="marketing-brand-mark"><BrandMark compact /></span><span>cuidam</span>
        </Link>
        <nav className="marketing-nav" aria-label="Navegação da página">
          <Link href="#como-funciona">Como funciona</Link>
          <Link href="#para-quem">Para quem é</Link>
          <Link href="#duvidas">Dúvidas</Link>
        </nav>
        <div className="marketing-header-actions">
          <Link className="marketing-login-link" href="/entrar?mode=login">Entrar</Link>
          <Link className="marketing-button marketing-button-small" href="/entrar?mode=signup">Começar</Link>
        </div>
      </div>
    </header>

    <section className="marketing-hero" aria-labelledby="marketing-title">
      <div className="marketing-hero-copy">
        <p className="marketing-eyebrow"><span aria-hidden="true">✳</span> Menos cobrança. Mais parceria.</p>
        <h1 id="marketing-title">A casa não precisa morar na cabeça de uma pessoa só.</h1>
        <p className="marketing-intro">Organize a rotina da casa, sozinho ou com quem divide esse cuidado com você. O Cuidam ajuda a deixar claro o que precisa acontecer, sem precisar lembrar ou cobrar.</p>
        <div className="marketing-hero-actions">
          <Link className="marketing-button" href="/entrar?mode=signup">Organizar nossa casa <span aria-hidden="true">↗</span></Link>
          <Link className="marketing-secondary-link" href="/entrar?mode=login">Já tenho uma conta</Link>
        </div>
        <p className="marketing-reassurance"><span><CheckMark /></span> Comece sozinho. Convide alguém quando fizer sentido.</p>
      </div>

      <div className="marketing-hero-art" aria-label="Exemplo ilustrativo de responsabilidades organizadas no Cuidam">
        <div className="marketing-sun-shape" aria-hidden="true" />
        <div className="marketing-leaf-sticker" aria-hidden="true"><LeafMark /></div>
        <div className="marketing-demo-card">
          <div className="marketing-demo-topline"><span>EXEMPLO DE UMA ROTINA</span><span className="marketing-demo-spark" aria-hidden="true">✳</span></div>
          <h2>Hoje, sem complicar.</h2>
          <p className="marketing-demo-caption">Uma casa · rotina em dia</p>
          <div className="marketing-demo-task">
            <span className="marketing-demo-icon demo-icon-kitchen" aria-hidden="true">⌂</span>
            <span className="marketing-demo-task-copy"><strong>Deixar a bancada livre</strong><small>Cozinha · sua responsabilidade</small></span>
            <span className="marketing-demo-check" aria-hidden="true"><CheckMark /></span>
          </div>
          <div className="marketing-demo-task">
            <span className="marketing-demo-icon demo-icon-shared" aria-hidden="true">↗</span>
            <span className="marketing-demo-task-copy"><strong>Preparar a sala para a noite</strong><small>Sala · responsabilidade compartilhada</small></span>
            <span className="marketing-demo-pill">Juntos</span>
          </div>
          <div className="marketing-demo-footer"><span className="marketing-demo-avatar avatar-green">L</span><span className="marketing-demo-avatar avatar-yellow">M</span><span>cada um cuida da sua parte</span></div>
        </div>
        <div className="marketing-floating-note"><span aria-hidden="true">☼</span><span><strong>Um dia de cada vez</strong><small>Sem lista infinita.</small></span></div>
        <span className="marketing-art-dot dot-coral" aria-hidden="true" />
        <span className="marketing-art-dot dot-blue" aria-hidden="true" />
      </div>
    </section>

    <section className="marketing-belief" id="para-quem" aria-labelledby="belief-title">
      <div className="marketing-belief-mark" aria-hidden="true"><BrandMark /></div>
      <div>
        <p className="marketing-eyebrow">Uma casa mais leve</p>
        <h2 id="belief-title">Cada um cuida do que é seu.</h2>
        <p>Responsabilidade clara tira o peso de lembrar, organizar e cobrar por todo mundo. O Cuidam ajuda a transformar combinações em uma rotina que funciona para vocês.</p>
      </div>
      <div className="marketing-belief-aside"><span className="belief-scribble" aria-hidden="true">“</span><strong>A gente sugere.<br />Vocês decidem.</strong></div>
    </section>

    <section className="marketing-how" id="como-funciona" aria-labelledby="how-title">
      <div className="marketing-section-heading">
        <p className="marketing-eyebrow">Simples de começar</p>
        <h2 id="how-title">Um combinado de cada vez.</h2>
        <p>Sem precisar organizar a casa inteira antes de dar o primeiro passo.</p>
      </div>
      <div className="marketing-steps">
        {steps.map((step) => <article className={`marketing-step-card step-${step.tone}`} key={step.number}>
          <span className="marketing-step-number">{step.number}</span>
          <div className="marketing-step-illustration" aria-hidden="true">{step.number === "01" ? <span className="step-room-icons">⌂ <i>✳</i> ◇</span> : step.number === "02" ? <span className="step-link-icons"><b>L</b><i>↔</i><b>M</b></span> : <span className="step-check-icon"><CheckMark /></span>}</div>
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
        </article>)}
      </div>
    </section>

    <section className="marketing-difference" aria-labelledby="difference-title">
      <div className="marketing-difference-copy">
        <p className="marketing-eyebrow">Mais parceria no dia a dia</p>
        <h2 id="difference-title">Não é só lembrar o que falta. É deixar claro quem cuida.</h2>
        <p>Quando as responsabilidades ficam visíveis, ninguém precisa carregar sozinho o trabalho de coordenar a casa.</p>
        <Link className="marketing-text-link" href="/entrar?mode=signup">Começar a organizar <span aria-hidden="true">→</span></Link>
      </div>
      <div className="marketing-difference-list">
        <article><span className="difference-icon difference-peach" aria-hidden="true">01</span><div><h3>Responsabilidades, não só tarefas</h3><p>Deixe combinado quem garante que cada parte aconteça.</p></div></article>
        <article><span className="difference-icon difference-sky" aria-hidden="true">02</span><div><h3>Ritmos que cabem na rotina</h3><p>Organize o que acontece hoje, ao longo da semana ou do mês.</p></div></article>
        <article><span className="difference-icon difference-butter" aria-hidden="true">03</span><div><h3>Uma visão da casa como um todo</h3><p>Enxerguem a divisão e ajustem o que não estiver funcionando.</p></div></article>
      </div>
    </section>

    <section className="marketing-faq" id="duvidas" aria-labelledby="faq-title">
      <div className="marketing-section-heading">
        <p className="marketing-eyebrow">Perguntas comuns</p>
        <h2 id="faq-title">Antes de começar.</h2>
      </div>
      <div className="marketing-faq-list">
        {faqs.map((faq) => <details className="marketing-faq-item" key={faq.q}><summary>{faq.q}<span aria-hidden="true">+</span></summary><p>{faq.a}</p></details>)}
      </div>
    </section>

    <section className="marketing-final-cta" aria-labelledby="final-cta-title">
      <div className="marketing-final-leaf" aria-hidden="true"><LeafMark /></div>
      <p className="marketing-eyebrow">Um começo mais leve</p>
      <h2 id="final-cta-title">Sua casa pode funcionar com mais parceria.</h2>
      <p>Comecem pelo que faz sentido para vocês. O resto pode vir depois.</p>
      <Link className="marketing-button marketing-button-light" href="/entrar?mode=signup">Começar com o Cuidam <span aria-hidden="true">↗</span></Link>
    </section>

    <footer className="marketing-footer">
      <Link href="/" className="marketing-brand" aria-label="cuidam — página inicial"><span className="marketing-brand-mark"><BrandMark compact /></span><span>cuidam</span></Link>
      <p>Uma casa mais leve começa com uma divisão clara.</p>
      <Link href="/entrar?mode=login">Entrar na minha conta <span aria-hidden="true">↗</span></Link>
      <small>© {new Date().getFullYear()} cuidam</small>
    </footer>
  </main>;
}
