import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiBaseUrl, getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

const colors = { cream: "#FAF7F2", white: "#FFFFFF", beige: "#F1ECE4", text: "#292A27", muted: "#777873", green: "#68BB7F", dark: "#376B45", line: "#E6DFD6", paleGreen: "#E4F2E6", coral: "#A45151" };

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading, configurationError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!loading && session) return <Redirect href="/today" />;

  const submit = async () => {
    setError("");
    setMessage("");
    setPending(true);
    try {
      const auth = getSupabaseClient().auth;
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Informe seu nome.");
        const { data, error: signupError } = await auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: `${getApiBaseUrl()}/entrar` },
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setMessage("Enviamos uma confirmação para seu e-mail. Confirme a conta e depois volte aqui para entrar. Por enquanto, o link abre o Cuidam no navegador.");
        }
      } else {
        const { error: loginError } = await auth.signInWithPassword({ email: email.trim(), password });
        if (loginError) throw loginError;
        router.replace("/today");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível continuar. Confira seus dados e tente novamente.");
    } finally {
      setPending(false);
    }
  };

  const requestRecovery = async () => {
    setError("");
    setMessage("");
    if (!email.trim()) { setError("Informe seu e-mail para receber o link de recuperação."); return; }
    setPending(true);
    try {
      const { error: recoveryError } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim());
      if (recoveryError) throw recoveryError;
      setMessage("Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação. Abra o link no navegador e depois entre novamente no app.");
    } catch {
      setError("Não foi possível enviar as instruções agora. Tente novamente mais tarde.");
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}><Text style={styles.brandMarkText}>⌂</Text></View>
              <Text style={styles.brand}>cuidam</Text>
            </View>
            <View style={styles.heroMark}><Text style={styles.heroMarkText}>⌂</Text><Text style={styles.leaf}>◞</Text></View>
            <Text style={styles.eyebrow}>{mode === "signup" ? "COMEÇANDO" : "DE VOLTA À CASA"}</Text>
            <Text style={styles.title}>{mode === "signup" ? "Vamos deixar isso fácil." : "Que bom ter você de volta."}</Text>
            <Text style={styles.description}>{mode === "signup" ? "Crie sua conta para começar a organizar o cuidado da casa." : "Entre para continuar de onde parou."}</Text>

            {mode === "signup" && <Field label="Seu nome" value={name} onChangeText={setName} placeholder="Como você quer ser chamado?" autoComplete="name" />}
            <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Pelo menos 8 caracteres" secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} />

            {configurationError ? <Text style={styles.error}>{configurationError}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed, pending && styles.disabled]} onPress={() => void submit()} disabled={pending || loading}>
              {pending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === "signup" ? "Criar conta" : "Entrar"}</Text>}
            </Pressable>
            {mode === "login" && <Pressable accessibilityRole="button" style={styles.textButton} onPress={() => void requestRecovery()} disabled={pending}><Text style={styles.textButtonText}>Esqueci minha senha</Text></Pressable>}
            <View style={styles.switchRow}>
              <Text style={styles.switchCopy}>{mode === "signup" ? "Já tem uma conta?" : "Ainda não tem uma conta?"}</Text>
              <Pressable onPress={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setMessage(""); }}><Text style={styles.switchAction}>{mode === "signup" ? "Entrar" : "Criar conta"}</Text></Pressable>
            </View>
            <Text style={styles.signature}>Cada um cuida do que é seu.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor="#A19E97" autoCorrect={false} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: colors.white, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: "#EEE9E2" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 28 },
  brandMark: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.dark },
  brandMarkText: { color: colors.white, fontSize: 22, fontWeight: "700", lineHeight: 26 },
  brand: { color: colors.dark, fontSize: 21, fontWeight: "800", letterSpacing: -0.6 },
  heroMark: { alignSelf: "center", width: 88, height: 88, borderRadius: 44, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 22 },
  heroMarkText: { color: colors.dark, fontSize: 54, fontWeight: "400", lineHeight: 64 },
  leaf: { position: "absolute", color: colors.green, fontSize: 25, right: 24, bottom: 19, transform: [{ rotate: "-25deg" }] },
  eyebrow: { color: colors.dark, fontSize: 11, fontWeight: "800", letterSpacing: 1.3, textAlign: "center", marginBottom: 8 },
  title: { color: colors.text, fontSize: 31, lineHeight: 36, fontWeight: "800", letterSpacing: -1.1, textAlign: "center", marginBottom: 9 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 22 },
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { minHeight: 52, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, color: colors.text, fontSize: 15 },
  primary: { minHeight: 52, borderRadius: 15, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.7 },
  textButton: { alignSelf: "center", minHeight: 48, justifyContent: "center", paddingHorizontal: 14 },
  textButtonText: { color: colors.dark, fontWeight: "700", fontSize: 14 },
  switchRow: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 13, paddingTop: 17, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  switchCopy: { color: colors.muted, fontSize: 13 },
  switchAction: { color: colors.dark, fontSize: 13, fontWeight: "800" },
  message: { color: colors.dark, fontSize: 13, lineHeight: 19, padding: 12, borderRadius: 12, backgroundColor: colors.paleGreen, marginBottom: 14 },
  error: { color: colors.coral, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  signature: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 18 },
});
