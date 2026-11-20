import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiBaseUrl, getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

type Task = {
  id: string;
  name: string;
  areaId: string;
  responsibility: "Você" | "Outra pessoa" | "Nós";
  recurrence: string;
  completed: boolean;
  completedCount: number;
  targetCompletions: number;
  occurrenceAvailable: boolean;
  archived: boolean;
  claimInProgress: boolean;
  claimOwnedByCurrentUser: boolean;
  claimOwnerName?: string | null;
};

type Household = { name: string; ownerName: string; areas: { id: string; name: string; icon?: string | null }[]; tasks: Task[] };
type ViewState = "loading" | "ready" | "no-house" | "error";
const colors = { cream: "#FAF7F2", white: "#FFFFFF", beige: "#F1ECE4", text: "#292A27", muted: "#777873", green: "#68BB7F", dark: "#376B45", line: "#E6DFD6", paleGreen: "#E4F2E6", yellow: "#F4C95D", blue: "#8EC8FF", coral: "#F58E8E", error: "#A45151" };

export default function TodayScreen() {
  const { session, loading: authLoading, signOut } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    await Promise.resolve();
    setError("");
    try {
      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };
      const onboardingResponse = await fetch(`${getApiBaseUrl()}/api/onboarding`, { headers });
      if (!onboardingResponse.ok) throw new Error(onboardingResponse.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível carregar sua casa.");
      const onboarding = await onboardingResponse.json();
      if (!onboarding.household) { setHousehold(null); setState("no-house"); return; }

      const response = await fetch(`${getApiBaseUrl()}/api/tasks`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as tarefas.");
      setHousehold(data.household as Household);
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar agora.");
      setState("error");
    }
  }, [session]);

  useEffect(() => { if (!authLoading) void Promise.resolve().then(load); }, [authLoading, load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const groups = useMemo(() => {
    const areas = new Map((household?.areas ?? []).map((area) => [area.id, area]));
    const tasks = (household?.tasks ?? []).filter((task) => !task.archived && task.occurrenceAvailable && !task.completed && task.responsibility !== "Outra pessoa");
    const definitions = [
      { id: "daily", title: "Hoje", hint: "Para cuidar ao longo do dia", tint: colors.yellow, predicate: (task: Task) => task.recurrence === "Diária" },
      { id: "weekly", title: "Nesta semana", hint: "Você tem até o fim da semana", tint: colors.blue, predicate: (task: Task) => task.recurrence !== "Diária" && task.recurrence !== "Mensal" },
      { id: "monthly", title: "Neste mês", hint: "Você tem até o fim do mês", tint: colors.coral, predicate: (task: Task) => task.recurrence === "Mensal" },
    ];
    return definitions.map((group) => ({ ...group, tasks: tasks.filter(group.predicate).map((task) => ({ ...task, area: areas.get(task.areaId)?.name ?? "Casa" })) })).filter((group) => group.tasks.length);
  }, [household]);

  if (!authLoading && !session) return <Redirect href="/login" />;

  const act = async (task: Task, action: "claim" | "complete") => {
    if (!household || workingId) return;
    setWorkingId(task.id);
    setError("");
    try {
      const { data: { session: currentSession } } = await getSupabaseClient().auth.getSession();
      if (!currentSession) throw new Error("Sua sessão expirou. Entre novamente.");
      const response = await fetch(`${getApiBaseUrl()}/api/tasks`, {
        method: "PATCH",
        headers: { "content-type": "application/json", Authorization: `Bearer ${currentSession.access_token}` },
        body: JSON.stringify({ taskId: task.id, ...(action === "claim" ? { action: "claim" } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar a tarefa.");
      setHousehold((current) => current ? { ...current, tasks: current.tasks.map((item) => item.id === task.id ? data.task : item) } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar. Tente novamente.");
      await load();
    } finally {
      setWorkingId(null);
    }
  };

  if (authLoading || state === "loading") return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.dark} /><Text style={styles.muted}>Abrindo sua casa…</Text></SafeAreaView>;

  if (state === "no-house") return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.noHouseCard}>
        <Brand />
        <Text style={styles.eyebrow}>SUA CASA</Text>
        <Text style={styles.title}>Vamos preparar seu espaço.</Text>
        <Text style={styles.subtitle}>A configuração inicial da casa ainda está disponível na versão web. Use sua mesma conta e volte ao app para cuidar do dia a dia.</Text>
        <Pressable style={styles.primary} onPress={() => void Linking.openURL(`${getApiBaseUrl()}/entrar?mode=login`)}><Text style={styles.primaryText}>Abrir o Cuidam no navegador</Text></Pressable>
        <Pressable style={styles.logout} onPress={() => void signOut()}><Text style={styles.logoutText}>Sair da conta</Text></Pressable>
      </View>
    </SafeAreaView>
  );

  if (state === "error") return (
    <SafeAreaView style={styles.center}>
      <Brand />
      <Text style={styles.title}>Não conseguimos abrir sua casa.</Text>
      <Text style={styles.subtitle}>{error}</Text>
      <Pressable style={styles.primary} onPress={() => void load()}><Text style={styles.primaryText}>Tentar novamente</Text></Pressable>
      <Pressable style={styles.logout} onPress={() => void signOut()}><Text style={styles.logoutText}>Sair da conta</Text></Pressable>
    </SafeAreaView>
  );

  const todayCount = groups.find((group) => group.id === "daily")?.tasks.length ?? 0;
  const weekCount = groups.find((group) => group.id === "weekly")?.tasks.length ?? 0;
  const monthCount = groups.find((group) => group.id === "monthly")?.tasks.length ?? 0;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.dark} />}>
        <View style={styles.topbar}><Brand /><Pressable onPress={() => void signOut()} hitSlop={12}><Text style={styles.logoutText}>Sair</Text></Pressable></View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>HOJE · {household?.name}</Text>
          <Text style={styles.title}>Bom dia, {household?.ownerName.split(" ")[0]} ☀️</Text>
          <Text style={styles.subtitle}>O que você cuida hoje?</Text>
        </View>
        <View style={styles.summary}><Text style={styles.summaryLabel}>Para hoje</Text><Text style={styles.summaryTitle}>{todayCount ? `${todayCount} ${todayCount === 1 ? "tarefa" : "tarefas"} para cuidar hoje` : "Sem tarefas diárias pendentes"}</Text>{Boolean(weekCount || monthCount) && <Text style={styles.summaryPeriod}>{[weekCount ? `${weekCount} ${weekCount === 1 ? "tarefa" : "tarefas"} nesta semana` : "", monthCount ? `${monthCount} ${monthCount === 1 ? "tarefa" : "tarefas"} neste mês` : ""].filter(Boolean).join(" · ")}</Text>}</View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {groups.length ? groups.map((group) => (
          <View key={group.id} style={styles.group}>
            <View style={[styles.groupAccent, { backgroundColor: group.tint }]} />
            <View style={styles.groupHeading}><View><Text style={styles.groupTitle}>{group.title}</Text><Text style={styles.groupHint}>{group.hint}</Text></View><View style={[styles.count, { backgroundColor: group.tint + "33" }]}><Text style={styles.countText}>{group.tasks.length}</Text></View></View>
            {group.tasks.map((task) => {
              const action = task.responsibility === "Nós" && !task.claimOwnedByCurrentUser ? "claim" : "complete";
              const claimedByOther = task.responsibility === "Nós" && task.claimInProgress && !task.claimOwnedByCurrentUser;
              const busy = workingId === task.id;
              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskIcon}><Text style={styles.taskIconText}>{task.area === "Cozinha" ? "♨" : task.area === "Pets" ? "🐾" : task.area === "Banheiro" ? "♧" : task.area === "Sala" ? "⌂" : "✿"}</Text></View>
                  <View style={styles.taskBody}><Text style={styles.taskName}>{task.name}</Text><Text style={styles.taskMeta}>{task.area} · {task.responsibility === "Nós" ? "Compartilhada" : "Sua responsabilidade"}</Text>{task.targetCompletions > 1 && <Text style={styles.taskProgress}>{task.completedCount} de {task.targetCompletions} nesta semana</Text>}{claimedByOther && <Text style={styles.claimText}>{task.claimOwnerName ?? "Outra pessoa"} está cuidando</Text>}</View>
                  <Pressable disabled={busy || claimedByOther} onPress={() => void act(task, action)} style={({ pressed }) => [styles.taskAction, action === "claim" ? styles.claimButton : styles.completeButton, pressed && styles.pressed, (busy || claimedByOther) && styles.disabled]}>
                    {busy ? <ActivityIndicator size="small" color={action === "claim" ? colors.dark : colors.white} /> : <Text style={[styles.taskActionText, action === "claim" && styles.claimButtonText]}>{claimedByOther ? "Em cuidado" : action === "claim" ? "Vou cuidar" : "Concluir"}</Text>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Sem tarefas pendentes.</Text><Text style={styles.subtitle}>A casa está em dia por enquanto.</Text></View>}
        <Text style={styles.signature}>Cada um cuida do que é seu.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Brand() { return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>⌂</Text></View><Text style={styles.brandName}>cuidam</Text></View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, padding: 24, gap: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  muted: { color: colors.muted, fontSize: 13 },
  scroll: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 35, width: "100%", maxWidth: 720, alignSelf: "center" },
  topbar: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 26 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.dark },
  brandMarkText: { color: colors.white, fontSize: 22, fontWeight: "700", lineHeight: 26 },
  brandName: { color: colors.dark, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  heading: { marginBottom: 20 },
  eyebrow: { color: colors.dark, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 7 },
  title: { color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.9, marginBottom: 7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  summary: { backgroundColor: "#F4FAF5", borderColor: "#D8EADF", borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 23 },
  summaryLabel: { color: colors.muted, fontSize: 12, marginBottom: 3 },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  summaryPeriod: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  group: { marginBottom: 20 },
  groupHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  groupAccent: { position: "absolute", left: 0, top: 2, bottom: 13, width: 3, borderRadius: 3 },
  groupTitle: { paddingLeft: 11, color: colors.text, fontSize: 16, fontWeight: "800" },
  groupHint: { paddingLeft: 11, marginTop: 2, color: colors.muted, fontSize: 12 },
  count: { minWidth: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  countText: { color: colors.dark, fontSize: 13, fontWeight: "800" },
  taskCard: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 78, padding: 12, marginBottom: 8, backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 17 },
  taskIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.beige, alignItems: "center", justifyContent: "center" },
  taskIconText: { color: colors.dark, fontSize: 22, fontWeight: "700" },
  taskBody: { flex: 1, minWidth: 0 },
  taskName: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: 3 },
  taskMeta: { color: colors.muted, fontSize: 11 },
  taskProgress: { color: colors.dark, fontSize: 11, fontWeight: "700", marginTop: 5 },
  claimText: { color: colors.muted, fontSize: 11, marginTop: 4 },
  taskAction: { minWidth: 83, minHeight: 46, paddingHorizontal: 12, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  claimButton: { backgroundColor: "#FFF0C8", borderColor: "#E9D79D", borderWidth: 1 },
  completeButton: { backgroundColor: colors.dark },
  taskActionText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  claimButtonText: { color: "#795D1F" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
  emptyCard: { padding: 22, alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 18 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 5 },
  signature: { color: colors.muted, textAlign: "center", fontSize: 12, marginTop: 18 },
  noHouseCard: { width: "100%", maxWidth: 520, padding: 24, backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 24, gap: 15 },
  primary: { minHeight: 52, paddingHorizontal: 18, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.dark, marginTop: 8 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  logout: { alignSelf: "center", minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  logoutText: { color: colors.dark, fontSize: 13, fontWeight: "800" },
  error: { color: colors.error, fontSize: 13, lineHeight: 19, backgroundColor: "#FCECEC", borderRadius: 11, padding: 12, marginBottom: 12 },
});
