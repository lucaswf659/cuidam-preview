import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/providers/auth-provider";

export default function IndexRoute() {
  const { session, loading } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color="#376B45" /></View>;
  return <Redirect href={session ? "/today" : "/login"} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAF7F2" } });
