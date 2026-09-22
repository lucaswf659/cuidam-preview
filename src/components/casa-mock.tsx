"use client";

import { FormEvent, useState } from "react";
import type { MockArea } from "@/lib/mock/store";

type AreaForm = { mode: "add" | "edit"; areaId?: string; name: string; icon: string };
const apiAreas = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/areas" : "/api/mock/areas";
const apiInvite = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/invite" : "/api/mock/invite";

export function CasaMock({ household }: { household: { name: string; ownerName: string; inviteEmail?: string; areas: MockArea[] } }) {
  const [areas, setAreas] = useState(household.areas);
  const [inviteEmail, setInviteEmail] = useState(household.inviteEmail ?? "");
  const [message, setMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [areaForm, setAreaForm] = useState<AreaForm | null>(null);
  const [areaError, setAreaError] = useState("");

  const openCreateArea = () => { setAreaError(""); setAreaForm({ mode: "add", name: "", icon: "🏡" }); };
  const openEditArea = (area: MockArea) => { setAreaError(""); setAreaForm({ mode: "edit", areaId: area.id, name: area.name, icon: area.icon }); };
  const updateAreaForm = (changes: Partial<AreaForm>) => setAreaForm((current) => current ? { ...current, ...changes } : current);

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

  const sendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setInviteError("");
    if (!inviteEmail.trim()) { setInviteError("Informe um e-mail para enviar o convite."); return; }
    const response = await fetch(apiInvite, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    if (response.ok) { setMessage("Convite registrado para esta casa."); return; }
    const data = await response.json().catch(() => null);
    setInviteError(data?.error ?? "Informe um e-mail válido.");
  };

  return <main className="casa-shell">
    <div className="topbar"><a className="brand-lockup" href="/today" aria-label="Voltar para Hoje"><span className="brand-mark">⌂</span><span>cuidam</span></a><span className="proto-badge">Você</span></div>
    <section className="casa-content">
      <div className="casa-heading"><p className="eyebrow">Casa</p><h1>{household.name}</h1><p className="lead">Um lugar simples para ajustar como vocês cuidam da casa.</p></div>
      <div className="casa-card casa-owner-card"><span className="meta-label">Pessoa responsável</span><strong>{household.ownerName}</strong><small>membro da casa</small></div>
      <div className="casa-areas-panel">
        <div className="section-heading casa-section-heading"><div><h2>Áreas da casa</h2><span>{areas.length} áreas</span></div><button className="button secondary compact-button" onClick={openCreateArea}>Adicionar área</button></div>
        <div className="settings-list">{areas.map((area) => { const isOpen = openArea === area.id; return <div className="settings-group" key={area.id}><button className="settings-row settings-row-button" onClick={() => setOpenArea(isOpen ? null : area.id)} aria-expanded={isOpen}><span className="settings-icon">{area.icon}</span><span className="settings-copy"><b>{area.name}</b><small>Área ativa</small></span><span className={`settings-chevron ${isOpen ? "open" : ""}`} aria-hidden="true">›</span></button>{isOpen && <div className="settings-options"><button className="settings-option-link" onClick={() => openEditArea(area)}>Editar área <span>✎</span></button><a href={`/nos?area=${encodeURIComponent(area.id)}`}>Ver tarefas desta área <span>→</span></a></div>}</div>; })}</div>
      </div>
      <div className="casa-share-panel"><div className="section-heading casa-invite-heading"><h2>Compartilhar a casa</h2></div><form className="casa-card casa-invite-card" onSubmit={sendInvite}><p>Convide alguém para participar dessa divisão quando fizer sentido.</p><label>E-mail<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="alguem@email.com" /></label>{inviteError && <small className="form-error" role="alert">{inviteError}</small>}{message && <small className="form-success" role="status">{message}</small>}<button className="button primary" type="submit">Enviar convite</button></form></div>
    </section>

    {areaForm && <div className="modal-backdrop"><section className="task-form-modal area-form-modal" role="dialog" aria-modal="true" aria-labelledby="area-form-title"><div className="task-form-heading"><div><span className="drawer-kicker">{areaForm.mode === "add" ? "Nova área" : "Editar área"}</span><h2 id="area-form-title">Como chamar esse espaço?</h2></div><button className="drawer-close" type="button" onClick={() => setAreaForm(null)} aria-label="Fechar formulário">×</button></div><form onSubmit={saveArea}><label>Nome da área<input value={areaForm.name} onChange={(event) => updateAreaForm({ name: event.target.value })} placeholder="Ex.: Varanda" required /></label><label>Ícone<input value={areaForm.icon} maxLength={4} onChange={(event) => updateAreaForm({ icon: event.target.value })} placeholder="🏡" /></label>{areaError && <p className="form-error">{areaError}</p>}<div className="form-actions"><button className="button secondary" type="button" onClick={() => setAreaForm(null)}>Cancelar</button><button className="button primary" type="submit">{areaForm.mode === "add" ? "Adicionar área" : "Salvar"}</button></div></form></section></div>}
    <nav className="bottom-nav"><a href="/today"><b>☀️</b>Hoje</a><a href="/nos"><b>🤝</b>Nós</a><a className="active" href="/casa"><b>🏡</b>Casa</a></nav>
  </main>;
}
