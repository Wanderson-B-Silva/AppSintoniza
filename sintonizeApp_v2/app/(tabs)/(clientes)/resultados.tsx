import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

type Avaliacao = {
  id: number;
  data_avaliacao: string;
  pontuacao_total: number;
  nivel: string;
  recomendacoes: string;
};

export default function Resultados() {
  const insets = useSafeAreaInsets();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [mediaBemEstar, setMediaBemEstar] = useState(0);

  useEffect(() => {
    carregarAvaliacoes();
    carregarCheckins();
  }, []);

  const carregarCheckins = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.historicoCheckin, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCheckins((data.checkins || []).slice().reverse());
        setMediaBemEstar(data.media_bem_estar || 0);
      }
    } catch {}
  };

  const carregarAvaliacoes = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.minhasAvaliacoes, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvaliacoes(data.avaliacoes || []);
      }
    } catch (error) {
      console.log("Erro ao carregar avaliações:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNivelInfo = (nivel: string) => {
    switch (nivel) {
      case "bom": return { label: "Bom", color: "#16A34A", bg: "#DCFCE7", icon: "happy-outline" as const };
      case "medio": return { label: "Atenção", color: "#D97706", bg: "#FEF3C7", icon: "alert-circle-outline" as const };
      case "risco": return { label: "Risco", color: "#DC2626", bg: "#FEE2E2", icon: "warning-outline" as const };
      default: return { label: nivel, color: colors.muted, bg: "#F1F5F9", icon: "help-circle-outline" as const };
    }
  };

  const formatarData = (data: string) => {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Meus resultados</Text>
      <Text style={styles.subtitle}>
        Histórico de avaliações e recomendações personalizadas.
      </Text>

      {checkins.length > 0 && (
        <View style={styles.bemEstarCard}>
          <View style={styles.bemEstarTop}>
            <View>
              <Text style={styles.bemEstarLabel}>Seu bem-estar</Text>
              <Text style={styles.bemEstarSub}>Média dos últimos check-ins</Text>
            </View>
            <View style={styles.bemEstarValueWrap}>
              <Text style={styles.bemEstarValue}>{mediaBemEstar.toFixed(1)}</Text>
              <Text style={styles.bemEstarMax}>/5</Text>
            </View>
          </View>
          <View style={styles.chartRow}>
            {checkins.map((c, i) => {
              const h = Math.max(8, (c.nota / 5) * 60);
              const cor = c.nota >= 4 ? "#16A34A" : c.nota >= 3 ? "#D97706" : "#DC2626";
              return (
                <View key={i} style={styles.chartBarWrap}>
                  <View style={[styles.chartBar, { height: h, backgroundColor: cor }]} />
                </View>
              );
            })}
          </View>
          <Text style={styles.chartLegend}>
            {checkins.length} registro{checkins.length > 1 ? "s" : ""} de humor
          </Text>
        </View>
      )}

      {avaliacoes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhuma avaliação encontrada.</Text>
          <Text style={styles.emptySubtext}>Responda um questionário para ver seus resultados aqui.</Text>
        </View>
      ) : (
        avaliacoes.map((av) => {
          const nivel = getNivelInfo(av.nivel);
          return (
            <View key={av.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.nivelBadge, { backgroundColor: nivel.bg }]}>
                  <Ionicons name={nivel.icon} size={16} color={nivel.color} />
                  <Text style={[styles.nivelText, { color: nivel.color }]}>{nivel.label}</Text>
                </View>
                <Text style={styles.data}>{formatarData(av.data_avaliacao)}</Text>
              </View>

              <View style={styles.pontuacaoRow}>
                <Text style={styles.pontuacaoLabel}>Pontuação total:</Text>
                <Text style={[styles.pontuacaoValor, { color: nivel.color }]}>{av.pontuacao_total}</Text>
              </View>

              <View style={styles.recBox}>
                <Ionicons name="bulb-outline" size={18} color="#D97706" />
                <Text style={styles.recText}>{av.recomendacoes}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 50, backgroundColor: "#EEF4F6", flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: colors.primary, marginBottom: 8 },
  subtitle: { color: colors.muted, marginBottom: 20 },
  bemEstarCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  bemEstarTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  bemEstarLabel: { fontSize: 17, fontWeight: "800", color: colors.primary },
  bemEstarSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  bemEstarValueWrap: { flexDirection: "row", alignItems: "flex-end" },
  bemEstarValue: { fontSize: 30, fontWeight: "900", color: colors.text },
  bemEstarMax: { fontSize: 16, color: colors.muted, marginBottom: 4 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 64, justifyContent: "center" },
  chartBarWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end", maxWidth: 16 },
  chartBar: { width: "100%", borderRadius: 4, minHeight: 8 },
  chartLegend: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 10 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.muted },
  emptySubtext: { fontSize: 14, color: "#94A3B8", textAlign: "center", maxWidth: 250 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  nivelBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  nivelText: { fontWeight: "700", fontSize: 13 },
  data: { fontSize: 12, color: colors.muted },
  pontuacaoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  pontuacaoLabel: { fontSize: 14, color: colors.text },
  pontuacaoValor: { fontSize: 20, fontWeight: "800" },
  recBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FDE68A",
  },
  recText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 20 },
});
