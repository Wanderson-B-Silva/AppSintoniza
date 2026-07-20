import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

export default function PerfilPsicologo() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.perfil, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPerfil(data);
      }
    } catch (error) {
      console.log("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const fazerLogout = async () => {
    appAlert("Sair", "Deseja realmente sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const nome = perfil?.first_name
    ? `${perfil.first_name} ${perfil.last_name || ""}`.trim()
    : perfil?.username || "Psicólogo";

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Ionicons name="medkit" size={42} color={colors.primary} />
        </View>
        <Text style={styles.name}>{nome}</Text>
        <Text style={styles.speciality}>
          {perfil?.psicologo?.especialidade || "Psicólogo(a)"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Empresa que você atende</Text>
        {perfil?.psicologo?.empresas?.length ? (
          perfil.psicologo.empresas.map((e: any) => (
            <InfoRow key={e.id} icon="business-outline" label={`Empresa #${e.id}`} value={e.razao_social} />
          ))
        ) : (
          <InfoRow icon="business-outline" label="Empresa" value="Nenhuma empresa vinculada" />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dados profissionais</Text>

        <InfoRow icon="ribbon-outline" label="CRP" value={perfil?.psicologo?.crp} />
        <InfoRow icon="medkit-outline" label="Especialidade" value={perfil?.psicologo?.especialidade} />
        <InfoRow icon="person-outline" label="Usuário" value={perfil?.username} />
        <InfoRow icon="mail-outline" label="Email" value={perfil?.email} />
        <InfoRow icon="call-outline" label="Telefone" value={perfil?.telefone || "Não informado"} />
        <InfoRow icon="calendar-outline" label="Cadastro" value={
          perfil?.data_cadastro ? new Date(perfil.data_cadastro).toLocaleDateString("pt-BR") : "—"
        } />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={fazerLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <>
      <View style={styles.infoRow}>
        <Ionicons name={icon} size={18} color={colors.muted} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || "—"}</Text>
        </View>
      </View>
      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF4F6" },
  content: { padding: 22, paddingTop: 50, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 28 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 14,
  },
  name: { fontSize: 24, fontWeight: "800", color: colors.primary },
  speciality: { fontSize: 14, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 6 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#FEE2E2", paddingVertical: 14, borderRadius: 14,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "700" },
});
