"use client";

import { useState } from "react";

export function LogoutButton() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out request failed");
      window.location.assign("/");
    } catch {
      setError("Não foi possível sair agora.");
      setPending(false);
    }
  };

  return <div className="logout-control">
    <button className="logout-button" type="button" onClick={logout} disabled={pending}>
      {pending ? "Saindo…" : "Sair"}
    </button>
    {error && <span className="logout-error" role="status">{error}</span>}
  </div>;
}

