"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { HouseholdInvitation, HouseholdPerson, MockArea, MockHousehold } from "@/lib/mock/store";
import { AppChrome } from "@/components/app-chrome";

type AreaForm = { mode: "add" | "edit"; areaId?: string; name: string; icon: string };
const apiAreas = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/areas" : "/api/mock/areas";
const apiInvite = process.env.NEXT_PUBLIC_CUIDAM_MOCK === "false" ? "/api/invite" : "/api/mock/invite";
const mockMode = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";

export function CasaMock({ household }: { household: MockHousehold }) {
  const [areas, setAreas] = useState(household.areas);
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>(household.invitations ?? (household.inviteEmail ? [{ id: "mock-pending-invite", email: household.inviteEmail, expiresAt: "" }] : []));
  const [inviteEmail, setInviteEmail] = useState(household.inviteEmail ?? "");
  const [message, setMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [areaForm, setAreaForm] = useState<AreaForm | null>(null);
  const [confirmArea, setConfirmArea] = useState<MockArea | null>(null);
  const [areaError, setAreaError] = useState("");
  const [areaManagerError, setAreaManagerError] = useState("");
  const members: HouseholdPerson[] = household.members ?? [{ id: "current-member", name: household.ownerName, email: household.ownerEmail, current: true }];
  const memberCount = household.memberCount ?? members.length;

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

  return <main className="casa-shell">
    <AppChrome current="casa" />
    <section className="casa-content">
      <div className="casa-heading"><p className="eyebrow">Casa</p><h1>{household.name}</h1><p className="lead">Um lugar simples para ajustar como vocês cuidam da casa.</p></div>
      <Link className="casa-division-card" href="/nos"><span className="casa-division-icon" aria-hidden="true">↗</span><span><b>Divisão</b><small>Veja como as responsabilidades estão distribuídas.</small></span><span className="casa-division-link">Ver divisão</span></Link>
      <section className="casa-people-panel" aria-labelledby="people-title">
        <div className="section-heading casa-section-heading"><div><h2 id="people-title">Pessoas</h2><span>{memberCount} de 2 pessoas na casa</span></div></div>
        <div className="casa-card casa-people-card">
          <div className="casa-people-list">{members.map((person) => <div className="casa-person-row" key={person.id}><span className="casa-person-avatar" aria-hidden="true">{person.name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "•"}</span><span><b>{person.name}</b><small>{person.current ? "Você" : "Membro da casa"}{person.email ? ` · ${person.email}` : ""}</small></span><span className="casa-person-status">Na casa</span></div>)}</div>
          {invitations.map((invitation) => <div className="casa-invitation-row" key={invitation.id}><span className="casa-invitation-icon" aria-hidden="true">✉</span><span><b>{invitation.email}</b><small>Convite aguardando resposta</small></span><button className="casa-invitation-cancel" type="button" onClick={() => void cancelInvitation(invitation.id)}>Cancelar</button></div>)}
          {!invitations.length && memberCount < 2 && <p className="casa-people-hint">Convide alguém quando quiser dividir a casa.</p>}
          {memberCount >= 2 && <p className="casa-people-hint">Esta casa já tem as duas pessoas previstas no MVP.</p>}
        </div>
      </section>
      <div className="casa-share-panel"><div className="section-heading casa-invite-heading"><h2>Compartilhar a casa</h2></div><form className="casa-card casa-invite-card" onSubmit={sendInvite}><p>Gere um link para a outra pessoa entrar direto nesta casa. Nenhum e-mail será enviado.</p><label>E-mail<input type="email" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteUrl(""); setMessage(""); setInviteError(""); }} placeholder="alguem@email.com" required disabled={memberCount >= 2} /></label>{inviteError && <small className="form-error" role="alert">{inviteError}</small>}{message && <small className="form-success" role="status">{message}</small>}{inviteUrl && <><label>Link do convite<input aria-label="Link do convite" type="text" className="invite-link-input" value={inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label><button className="button secondary" type="button" onClick={copyInviteLink}>Copiar link</button></>}{memberCount < 2 && <button className="button primary" type="submit" disabled={invitePending}>{invitePending ? "Gerando link…" : inviteUrl ? "Gerar outro link" : mockMode ? "Gerar link de teste" : "Gerar link do convite"}</button>}</form></div>
      <div className="casa-areas-panel">
        <div className="section-heading casa-section-heading"><div><h2>Áreas da casa</h2><span>{areas.length} áreas</span></div><button className="button secondary compact-button" onClick={openCreateArea}>Adicionar área</button></div>
        {areaManagerError && <p className="form-error" role="alert">{areaManagerError}</p>}
        <div className="settings-list">{areas.length ? areas.map((area, index) => { const isOpen = openArea === area.id; return <div className="settings-group" key={area.id}><button className="settings-row settings-row-button" onClick={() => setOpenArea(isOpen ? null : area.id)} aria-expanded={isOpen}><span className="settings-icon">{area.icon}</span><span className="settings-copy"><b>{area.name}</b><small>Área ativa</small></span><span className={`settings-chevron ${isOpen ? "open" : ""}`} aria-hidden="true">›</span></button>{isOpen && <div className="settings-options"><button className="settings-option-link" onClick={() => openEditArea(area)}>Editar área <span>✎</span></button><Link href={`/nos?area=${encodeURIComponent(area.id)}`}>Ver tarefas desta área <span>→</span></Link><div className="area-order-actions"><button className="area-order-button" type="button" disabled={index === 0} aria-label={`Mover ${area.name} para cima`} onClick={() => void moveArea(area.id, -1)}>↑ <span>Mover para cima</span></button><button className="area-order-button" type="button" disabled={index === areas.length - 1} aria-label={`Mover ${area.name} para baixo`} onClick={() => void moveArea(area.id, 1)}>↓ <span>Mover para baixo</span></button><button className="area-archive-button" type="button" onClick={() => setConfirmArea(area)}>Arquivar área</button></div></div>}</div>; }) : <p className="area-empty casa-area-empty">Ainda não há áreas. Adicione uma quando fizer sentido para a casa.</p>}</div>
      </div>
      <div className="casa-notifications-panel"><div className="section-heading casa-section-heading"><div><h2>Notificações</h2><span>Lembretes e atividade</span></div><Link className="button secondary compact-button" href="/casa/notificacoes">Configurar</Link></div></div>
    </section>

    {areaForm && <div className="modal-backdrop"><section className="task-form-modal area-form-modal" role="dialog" aria-modal="true" aria-labelledby="area-form-title"><div className="task-form-heading"><div><span className="drawer-kicker">{areaForm.mode === "add" ? "Nova área" : "Editar área"}</span><h2 id="area-form-title">Como chamar esse espaço?</h2></div><button className="drawer-close" type="button" onClick={() => setAreaForm(null)} aria-label="Fechar formulário">×</button></div><form onSubmit={saveArea}><label>Nome da área<input value={areaForm.name} onChange={(event) => updateAreaForm({ name: event.target.value })} placeholder="Ex.: Varanda" required /></label><label>Ícone<input value={areaForm.icon} maxLength={4} onChange={(event) => updateAreaForm({ icon: event.target.value })} placeholder="🏡" /></label>{areaError && <p className="form-error">{areaError}</p>}<div className="form-actions"><button className="button secondary" type="button" onClick={() => setAreaForm(null)}>Cancelar</button><button className="button primary" type="submit">{areaForm.mode === "add" ? "Adicionar área" : "Salvar"}</button></div></form></section></div>}
    {confirmArea && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="archive-area-title"><span className="confirm-icon">−</span><h2 id="archive-area-title">Arquivar {confirmArea.name}?</h2><p>As tarefas ativas dessa área também saem da rotina. O histórico delas continua guardado.</p><div><button className="button secondary" onClick={() => setConfirmArea(null)}>Voltar</button><button className="button danger-button" onClick={() => void archiveArea()}>Arquivar área</button></div></section></div>}
  </main>;
}
