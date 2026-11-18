"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppChrome } from "@/components/app-chrome";
import styles from "./rewards-view.module.css";

type Reward = { id: string; name: string; cost: number; recipientType: "HOUSEHOLD" | "MEMBER"; recipientMemberId: string | null };
type Member = { id: string; name: string };
type Snapshot = { balance: number; rewards: Reward[]; members: Member[]; history: { id: string; rewardName: string; redeemedBy: string; cost: number; redeemedAt: string }[] };
const empty: Snapshot = { balance: 0, rewards: [], members: [], history: [] };

export function RewardsView({ householdName }: { householdName: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cost, setCost] = useState(5);
  const [recipientType, setRecipientType] = useState<"HOUSEHOLD" | "MEMBER">("HOUSEHOLD");
  const [recipientMemberId, setRecipientMemberId] = useState("");
  const redemptionKeys = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/rewards", { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as recompensas.");
      setSnapshot(data);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") throw new Error("A resposta demorou mais que o esperado.");
      throw reason;
    } finally { window.clearTimeout(timeout); }
  }, []);
  const loadRewards = useCallback(async () => {
    setLoading(true); setError("");
    try { await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as recompensas."); }
    finally { setLoading(false); }
  }, [refresh]);
  useEffect(() => { void loadRewards(); }, [loadRewards]);

  const resetForm = () => { setEditing(null); setName(""); setCost(5); setRecipientType("HOUSEHOLD"); setRecipientMemberId(""); };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/rewards", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(editing ? { rewardId: editing, action: "edit" } : {}), name, cost, recipientType, recipientMemberId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      await refresh(); resetForm(); setMessage("Recompensa salva.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar."); }
    finally { setWorking(false); }
  };
  const action = async (reward: Reward, verb: "redeem" | "archive") => {
    setWorking(true); setError(""); setMessage("");
    try {
      const idempotencyKey = verb === "redeem" ? redemptionKeys.current.get(reward.id) ?? crypto.randomUUID() : undefined;
      if (idempotencyKey) redemptionKeys.current.set(reward.id, idempotencyKey);
      const response = await fetch("/api/rewards", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ rewardId: reward.id, action: verb, ...(idempotencyKey ? { idempotencyKey } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
      if (verb === "redeem") redemptionKeys.current.delete(reward.id);
      await refresh(); setMessage(verb === "redeem" ? `Resgate de “${reward.name}” registrado.` : "Recompensa removida da lista.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a ação."); }
    finally { setWorking(false); }
  };
  const edit = (reward: Reward) => { setEditing(reward.id); setName(reward.name); setCost(reward.cost); setRecipientType(reward.recipientType); setRecipientMemberId(snapshot.members.find((member) => member.id === reward.recipientMemberId)?.id ?? ""); };

  return <main className="rewards-shell">
    <AppChrome current="rewards" />
    <section className="rewards-content">
      <p className="eyebrow">Recompensas · {householdName}</p><h1>Um combinado para celebrar.</h1><p className="lead">As estrelas vêm do que vocês fazem juntos. Usem o saldo como fizer sentido para a casa.</p>
      <article className="rewards-balance"><span>Saldo compartilhado</span><strong aria-live="polite">{loading ? "…" : snapshot.balance} <small>★</small></strong></article>
      <div className="rewards-section-heading"><h2>Para resgatar</h2><span>{snapshot.rewards.length} {snapshot.rewards.length === 1 ? "recompensa" : "recompensas"}</span></div>
      {loading ? <p className="rewards-empty" role="status">Carregando recompensas…</p> : error && snapshot.rewards.length === 0 ? <div className="rewards-empty" role="status"><p>{error}</p><button className="button secondary" onClick={loadRewards}>Tentar novamente</button></div> : snapshot.rewards.length ? <div className="rewards-grid">{snapshot.rewards.map((reward) => <article className="reward-card" key={reward.id}><div className="reward-card-icon" aria-hidden="true">✦</div><div className="reward-card-info"><h3>{reward.name}</h3><p>{reward.recipientType === "HOUSEHOLD" ? "Para a casa" : `Para ${snapshot.members.find((member) => member.id === reward.recipientMemberId)?.name ?? "uma pessoa"}`}</p></div><strong className="reward-cost">{reward.cost} ★</strong><button className="button primary" disabled={working || snapshot.balance < reward.cost} onClick={() => action(reward, "redeem")}>Resgatar</button><div className="reward-card-secondary"><button onClick={() => edit(reward)}>Editar</button><button onClick={() => action(reward, "archive")}>Remover</button></div></article>)}</div> : <p className="rewards-empty">Ainda não há recompensas. Vocês podem combinar uma recompensa simples para começar.</p>}
      {message && <p className="form-success" role="status">{message}</p>}{error && !loading && snapshot.rewards.length > 0 && <p className="form-error" role="alert">{error}</p>}
      <section className="reward-form-card"><h2>{editing ? "Ajustar recompensa" : "Criar recompensa"}</h2><form className={styles.form} onSubmit={save}><label className={styles.wideField}>O que vocês gostariam de resgatar?<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Escolher o jantar de sexta" required /></label><label>Custo em estrelas<input type="number" min={1} max={999} value={cost} onChange={(event) => setCost(Number(event.target.value))} required /></label><label>Para<select value={recipientType} onChange={(event) => setRecipientType(event.target.value as "HOUSEHOLD" | "MEMBER")}><option value="HOUSEHOLD">A casa</option><option value="MEMBER">Uma pessoa</option></select></label>{recipientType === "MEMBER" && <label>Quem recebe?<select value={recipientMemberId} onChange={(event) => setRecipientMemberId(event.target.value)} required><option value="">Escolha uma pessoa</option>{snapshot.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}<div className={styles.actions}>{editing && <button className="button secondary" type="button" onClick={resetForm}>Cancelar edição</button>}<button className="button primary" disabled={working}>{working ? "Salvando…" : editing ? "Salvar alterações" : "Adicionar recompensa"}</button></div></form></section>
      {snapshot.history.length > 0 && <section className="reward-history"><h2>Resgates recentes</h2>{snapshot.history.map((item) => <div key={item.id}><span>{item.rewardName}<small> · {item.redeemedBy}</small></span><strong>−{item.cost} ★</strong></div>)}</section>}
    </section>
  </main>;
}
