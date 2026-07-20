import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useState, useCallback } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

type FilaItem = {
  predicao_id: number;
  funcionario_id: number;
  funcionario_nome: string;
  empresa_nome: string;
  departamento: string;
  cargo: string;
  nivel_risco: string;
  probabilidade: number;
  score_prioridade: number;
  data_predicao: string;
  atendido: boolean;
  probabilidades: Record<string, number> | null;
};

// A fila vai apenas de "Atenção" (Médio) até "Crítico". "Baixo" não entra.
const NIVEL_INFO: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  "Crítico": { color: "#B91C1C", bg: "#FEE2E2", icon: "alert-circle", label: "Crítico" },
  "Alto": { color: "#DC2626", bg: "#FEF2F2", icon: "warning", label: "Alto" },
  "Médio": { color: "#D97706", bg: "#FEF3C7", icon: "information-circle", label: "Atenção" },
};

const getNivelInfo = (nivel: string) =>
  NIVEL_INFO[nivel] || { color: colors.muted, bg: "#F1F5F9", icon: "help-circle", label: nivel };

export default function FilaPrioridade() {
  const insets = useSafeAreaInsets();
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("todos");
  const [resumo, setResumo] = useState<Record<string, number>>({});
  const [empresaNome, setEmpresaNome] = useState<string>("");

  useEffect(() => {
    carregarFila();
  }, [nivelFiltro]);

  const carregarFila = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      let url = API_ROUTES.filaPrioridade;
      if (nivelFiltro !== "todos") {
        url += `?nivel=${encodeURIComponent(nivelFiltro)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const lista: FilaItem[] = data.fila || [];
        setFila(lista);
        setResumo(data.resumo_niveis || {});
        if (lista.length > 0) setEmpresaNome(lista[0].empresa_nome);
      } else {
        const data = await res.json();
        appAlert("Erro", data.erro || "Erro ao carregar fila.");
      }
    } catch (error) {
      appAlert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarFila();
  }, [nivelFiltro]);

  const marcarAtendido = async (predicaoId: number) => {
    appAlert("Confirmar atendimento", "Deseja marcar este caso como atendido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(
              `${API_ROUTES.marcarAtendido}/${predicaoId}/atender/`,
              {
                method: "POST",
                headers: {
                  Authorization: `Token ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ observacoes: "Atendimento realizado via app." }),
              }
            );
            if (res.ok) {
              appAlert("Pronto", "Caso marcado como atendido.");
              carregarFila();
            } else {
              const data = await res.json();
              appAlert("Erro", data.erro || "Erro ao marcar atendimento.");
            }
          } catch (error) {
            appAlert("Erro", "Erro ao conectar com o servidor.");
          }
        },
      },
    ]);
  };

  const resultados = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!t) return fila;
    return fila.filter(
      (item) =>
        item.funcionario_nome.toLowerCase().includes(t) ||
        (item.departamento || "").toLowerCase().includes(t) ||
        (item.cargo || "").toLowerCase().includes(t)
    );
  }, [filtro, fila]);

  const totalFila = fila.length;
  const criticos = resumo["Crítico"] || 0;
  const altos = resumo["Alto"] || 0;
  const atencao = resumo["Médio"] || 0;

  const formatarData = (data: string) => {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando fila de prioridade...</Text>
      </View>
    );
  }

  const FILTROS = [
    { key: "todos", label: "Todos" },
    { key: "Crítico", label: "Crítico" },
    { key: "Alto", label: "Alto" },
    { key: "Médio", label: "Atenção" },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroGlow2} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="pulse" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Fila de Prioridade</Text>
            <Text style={styles.heroSub} numberOfLines={1}>
              {empresaNome ? empresaNome : "Triagem assistida por IA"}
            </Text>
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{totalFila}</Text>
            <Text style={styles.heroStatLabel}>na fila</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatNum, { color: "#FECACA" }]}>{criticos}</Text>
            <Text style={styles.heroStatLabel}>críticos</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatNum, { color: "#FDE68A" }]}>{atencao + altos}</Text>
            <Text style={styles.heroStatLabel}>atenção</Text>
          </View>
        </View>
      </View>

      {/* Aviso de sigilo + regra da fila */}
      <View style={styles.noteCard}>
        <Ionicons name="lock-closed" size={15} color={colors.primary} />
        <Text style={styles.noteText}>
          Informação clínica confidencial. A fila prioriza casos de{" "}
          <Text style={styles.noteStrong}>Atenção a Crítico</Text> — quem está sem
          risco não aparece aqui.
        </Text>
      </View>

      {/* Cards de resumo (sem "Baixo") */}
      <View style={styles.resumoRow}>
        {["Crítico", "Alto", "Médio"].map((nivel) => {
          const info = getNivelInfo(nivel);
          const qtd = resumo[nivel] || 0;
          return (
            <View key={nivel} style={[styles.resumoCard, { borderTopColor: info.color }]}>
              <Ionicons name={info.icon} size={18} color={info.color} />
              <Text style={[styles.resumoNum, { color: info.color }]}>{qtd}</Text>
              <Text style={styles.resumoLabel}>{info.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Busca */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          placeholder="Buscar por nome, cargo ou setor"
          value={filtro}
          onChangeText={setFiltro}
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />
        {filtro.length > 0 && (
          <TouchableOpacity onPress={() => setFiltro("")}>
            <Ionicons name="close-circle" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros (sem "Baixo") */}
      <View style={styles.filtersRow}>
        {FILTROS.map((f) => {
          const active = nivelFiltro === f.key;
          const info = f.key !== "todos" ? getNivelInfo(f.key) : null;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                active && { backgroundColor: info?.color || colors.primary, borderColor: info?.color || colors.primary },
              ]}
              onPress={() => setNivelFiltro(f.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista */}
      {resultados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhum caso na fila.</Text>
          <Text style={styles.emptySub}>
            Quando alguém da sua empresa precisar de atenção, aparece aqui.
          </Text>
        </View>
      ) : (
        resultados.map((item, index) => {
          const nivel = getNivelInfo(item.nivel_risco);
          const top3 = index < 3;
          return (
            <View
              key={item.predicao_id}
              style={[styles.card, { borderLeftColor: nivel.color }]}
            >
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.posBadge,
                    top3 && { backgroundColor: nivel.color },
                  ]}
                >
                  <Text style={[styles.posText, top3 && { color: "#fff" }]}>
                    {index + 1}º
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNome} numberOfLines={1}>
                    {item.funcionario_nome}
                  </Text>
                  <Text style={styles.cardDepto} numberOfLines={1}>
                    {item.cargo}
                    {item.departamento ? ` • ${item.departamento}` : ""}
                  </Text>
                </View>
                <View style={[styles.nivelBadge, { backgroundColor: nivel.bg }]}>
                  <Ionicons name={nivel.icon} size={14} color={nivel.color} />
                  <Text style={[styles.nivelText, { color: nivel.color }]}>{nivel.label}</Text>
                </View>
              </View>

              {/* Métricas */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Prioridade</Text>
                  <Text style={[styles.metricValue, { color: nivel.color }]}>
                    {item.score_prioridade.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Confiança IA</Text>
                  <Text style={styles.metricValue}>
                    {(item.probabilidade * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Sinalizado</Text>
                  <Text style={styles.metricValue}>{formatarData(item.data_predicao)}</Text>
                </View>
              </View>

              {/* Barra de prioridade */}
              <View style={styles.scoreBarBg}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${Math.min(item.score_prioridade, 100)}%`,
                      backgroundColor: nivel.color,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={[styles.atenderBtn, { backgroundColor: nivel.color }]}
                onPress={() => marcarAtendido(item.predicao_id)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.atenderText}>Marcar como atendido</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EEF4F6" },
  container: { padding: 18, flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: "#EEF4F6" },
  loadingText: { color: colors.muted, fontSize: 15 },

  // Hero
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroGlow: {
    position: "absolute", top: -50, right: -30, width: 160, height: 160,
    borderRadius: 80, backgroundColor: "rgba(95,191,140,0.25)",
  },
  heroGlow2: {
    position: "absolute", bottom: -60, left: -40, width: 180, height: 180,
    borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },

  heroStatsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 16, paddingVertical: 12,
  },
  heroStat: { alignItems: "center", flex: 1 },
  heroStatNum: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2, fontWeight: "600" },
  heroDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.18)" },

  // Nota de sigilo
  noteCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#EEF1FF", borderRadius: 14, padding: 12, marginBottom: 16,
  },
  noteText: { flex: 1, fontSize: 12, color: "#475569", lineHeight: 17 },
  noteStrong: { fontWeight: "800", color: colors.primary },

  // Resumo
  resumoRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  resumoCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", borderTopWidth: 3, gap: 2,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  resumoNum: { fontSize: 24, fontWeight: "800" },
  resumoLabel: { fontSize: 11, color: colors.muted, fontWeight: "700" },

  // Busca
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 14, marginBottom: 14, backgroundColor: "#fff",
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },

  // Filtros
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  filterBtn: {
    borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff",
  },
  filterText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  filterTextActive: { color: "#fff" },

  // Cards
  card: {
    backgroundColor: "#fff", borderRadius: 18, marginBottom: 14, padding: 16,
    borderLeftWidth: 5,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  posBadge: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  posText: { fontSize: 13, fontWeight: "800", color: colors.muted },
  cardNome: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardDepto: { fontSize: 12, color: colors.muted, marginTop: 2 },
  nivelBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  nivelText: { fontWeight: "800", fontSize: 12 },

  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metricItem: { alignItems: "flex-start" },
  metricLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  metricValue: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 2 },

  scoreBarBg: { height: 7, borderRadius: 4, backgroundColor: "#EEF2F6", overflow: "hidden", marginBottom: 14 },
  scoreBarFill: { height: "100%", borderRadius: 4 },

  atenderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12,
  },
  atenderText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  emptyContainer: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 16, color: colors.text, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: "center", paddingHorizontal: 30 },
});
