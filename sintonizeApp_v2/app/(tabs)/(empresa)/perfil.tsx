import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";
import { Card } from "../../../components/Card";
import { useFeedback } from "../../../components/Feedback";
import { createTabBarScrollHandler } from "../../../components/tabBarStore";

const handleTabScroll = createTabBarScrollHandler();

export default function PerfilEmpresa() {
  const { toast, confirm } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [exportando, setExportando] = useState(false);

  const carregar = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const id = await AsyncStorage.getItem("empresa_id");
      if (id) setEmpresaId(id);

      const res = await fetch(API_ROUTES.perfil, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) setPerfil(await res.json());
    } catch (e) {
      console.log("Erro perfil empresa:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  const copiarId = async () => {
    if (!empresaId) return;
    toast(`ID da empresa: ${empresaId} — use no cadastro de colaboradores.`, "info");
  };

  const exportarDados = async () => {
    try {
      setExportando(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.lgpdExportar, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        toast("Exportação dos dados solicitada com sucesso.", "success");
      } else {
        toast("Não foi possível solicitar a exportação agora.", "error");
      }
    } catch {
      toast("Falha ao conectar com o servidor.", "error");
    } finally {
      setExportando(false);
    }
  };

  const sair = async () => {
    const ok = await confirm({
      title: "Sair da conta",
      message: "Deseja realmente sair?",
      confirmText: "Sair",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;
    await AsyncStorage.clear();
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const empresa = perfil?.empresa || {};
  const nome =
    empresa.razao_social || empresa.nome_fantasia || perfil?.first_name || "Empresa";
  const email = perfil?.email || "—";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} onScroll={handleTabScroll} scrollEventThrottle={16}>
      {/* Cabeçalho de perfil */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Ionicons name="business" size={36} color="#fff" />
        </View>
        <Text style={styles.nome} numberOfLines={2}>{nome}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* ID da empresa */}
      <Card style={styles.idCard} elevation="sm">
        <View style={styles.idHeader}>
          <Ionicons name="key" size={18} color={colors.primary} />
          <Text style={styles.idTitle}>ID da Empresa</Text>
        </View>
        <Text style={styles.idHint}>
          Compartilhe este código para que colaboradores se vinculem à empresa.
        </Text>
        <TouchableOpacity style={styles.idBox} onPress={copiarId} activeOpacity={0.8}>
          <Text style={styles.idValue}>{empresaId || "—"}</Text>
          <Ionicons name="copy-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* Dados cadastrais */}
      <Text style={styles.section}>Dados cadastrais</Text>
      <Card padded={false}>
        <InfoRow icon="business-outline" label="Razão social" value={empresa.razao_social} />
        <InfoRow icon="pricetag-outline" label="Nome fantasia" value={empresa.nome_fantasia} />
        <InfoRow icon="document-text-outline" label="CNPJ" value={empresa.cnpj} />
        <InfoRow icon="mail-outline" label="E-mail" value={email} last />
      </Card>

      {/* LGPD */}
      <Text style={styles.section}>Privacidade (LGPD)</Text>
      <TouchableOpacity style={styles.lgpdBtn} onPress={exportarDados} disabled={exportando} activeOpacity={0.8}>
        <View style={[styles.lgpdIcon, { backgroundColor: colors.infoSoft }]}>
          <Ionicons name="download-outline" size={20} color={colors.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.lgpdTitle}>Exportar meus dados</Text>
          <Text style={styles.lgpdDesc}>Solicite uma cópia dos dados da empresa</Text>
        </View>
        {exportando ? (
          <ActivityIndicator color={colors.info} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.subtle} />
        )}
      </TouchableOpacity>

      {/* Sair */}
      <TouchableOpacity style={styles.logout} onPress={sair} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Ionicons name={icon} size={18} color={colors.subtle} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  content: { padding: 20, paddingTop: 50, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgSoft },

  hero: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 84, height: 84, borderRadius: 26, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  nome: { fontSize: 22, fontWeight: "800", color: colors.primary, textAlign: "center" },
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },

  idCard: { marginBottom: 20 },
  idHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  idTitle: { fontSize: 15, fontWeight: "800", color: colors.textStrong },
  idHint: { fontSize: 12, color: colors.muted, marginBottom: 12, lineHeight: 18 },
  idBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.primarySoft, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
  },
  idValue: { fontSize: 20, fontWeight: "900", color: colors.primary, letterSpacing: 1 },

  section: { fontSize: 16, fontWeight: "800", color: colors.textStrong, marginBottom: 12, marginTop: 4 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  infoRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 15, color: colors.textStrong, fontWeight: "600", marginTop: 1 },

  lgpdBtn: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff",
    borderRadius: 16, padding: 14, marginBottom: 24,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  lgpdIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lgpdTitle: { fontSize: 15, fontWeight: "700", color: colors.textStrong },
  lgpdDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },

  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.dangerSoft, borderRadius: 16, paddingVertical: 16,
  },
  logoutText: { color: colors.danger, fontWeight: "800", fontSize: 15 },
});
