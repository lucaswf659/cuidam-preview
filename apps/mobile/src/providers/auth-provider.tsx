import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configurationError: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialAuth] = useState(() => {
    try {
      return { client: getSupabaseClient(), error: "" };
    } catch (error) {
      return {
        client: null,
        error: error instanceof Error ? error.message : "Configure o acesso ao Supabase para iniciar o app."
      };
    }
  });
  const client = initialAuth.client;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [configurationError, setConfigurationError] = useState(initialAuth.error);

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data, error }) => {
        if (error) setConfigurationError("Não foi possível restaurar sua sessão. Entre novamente.");
        setSession(data.session);
        setLoading(false);
      }).catch(() => {
        setConfigurationError("Não foi possível restaurar sua sessão. Confira sua conexão e tente novamente.");
        setLoading(false);
      });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      });
      const appState = AppState.addEventListener("change", (state) => {
        if (state === "active") void client.auth.startAutoRefresh();
        else void client.auth.stopAutoRefresh();
      });
    if (AppState.currentState === "active") void client.auth.startAutoRefresh();
    return () => {
      subscription.unsubscribe();
      appState.remove();
      void client.auth.stopAutoRefresh();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configurationError,
    signOut: async () => {
      if (client) await client.auth.signOut();
    },
  }), [client, configurationError, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return value;
}
