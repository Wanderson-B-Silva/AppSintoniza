import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

export default function HomePsicologo() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState("Psicólogo");
  const [crp, setCrp] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0);
  const [riscos, setRiscos] = useState(0);
  const [bons, setBons] = useState(0);
  const [medios, setMedios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAvaliacoes, setRecentAvaliacoes] = useState<any[]>([]);

  const carregarDados = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const perfilRes = await fetch(API_ROUTES.perfil, { headers: { Authorization: `Token ${token}` } });
      if (perfilRes.ok) {
        const perfil = await perfilRes.json();
        setNome(perfil.first_name || perfil.username || "Psicólogo");
        setCrp(perfil.psicologo?.crp || "");
        setEspecialidade(perfil.psicologo?.especialidade || "");
        setEmpresa(perfil.psicologo?.empresa_principal || "");
      }
      const avRes = await fetch(API_ROUTES.avaliacoesPsicologo, { headers: { Authorization: `Token ${token}` } });
      if (avRes.ok) {
        const avData = await avRes.json();
        const avaliacoes = avData.avaliacoes || [];
        setTotalAvaliacoes(avData.total || 0);
        setRiscos(avaliacoes.filter((a: any) => a.nivel === "risco").length);
        setBons(avaliacoes.filter((a: any) => a.nivel === "bom").length);
        setMedios(avaliacoes.filter((a: any) => a.nivel === "medio").length);
        setRecentAvaliacoes(avaliacoes.slice(0, 5));
      }
    } catch (error) { console.log("Erro:", error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { carregarDados(); }, []));

  const onRefresh = useCallback(() => { setRefreshing(true); carregarDados(); }, []);

  const getNivelInfo = (nivel: string) => {
    switch (nivel) {
      case "bom": return { color: "#059669", bg: "#D1FAE5", label: "Saudável", icon: "checkmark-circle" as const };
      case "medio": return { color: "#D97706", bg: "#FEF3C7", label: "Atenção", icon: "alert-circle" as const };
      case "risco": return { color: "#DC2626", bg: "#FEE2E2", label: "Crítico", icon: "warning" as const };
      default: return { color: colors.muted, bg: "#F1F5F9", label: nivel, icon: "help-circle" as const };
    }
  };

  if (loading && !refreshing) return <View style={s.lc}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const totalN = bons + medios + riscos;

  return (
    <ScrollView
      style={s.c}
      contentContainerStyle={[s.cc, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroGlow} />
        <View style={s.heroRow}>
          <View style={s.heroIcon}><Ionicons name="medkit" size={24} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.greet}>Bem-vindo(a),</Text>
            <Text style={s.nome}>Dr(a). {nome}</Text>
            {crp ? <Text style={s.crp}>CRP {crp}{especialidade ? ` · ${especialidade}` : ""}</Text> : null}
          </View>
        </View>
        {empresa ? (
          <View style={s.empresaPill}>
            <Ionicons name="business" size={14} color={colors.primary} />
            <Text style={s.empresaTxt} numberOfLines={1}>{empresa}</Text>
          </View>
        ) : null}

        <View style={s.heroStats}>
          <View style={s.hStat}>
            <Text style={s.hNum}>{totalAvaliacoes}</Text>
            <Text style={s.hLbl}>avaliações</Text>
          </View>
          <View style={s.hDiv} />
          <View style={s.hStat}>
            <Text style={[s.hNum, { color: "#FDE68A" }]}>{medios}</Text>
            <Text style={s.hLbl}>atenção</Text>
          </View>
          <View style={s.hDiv} />
          <View style={s.hStat}>
            <Text style={[s.hNum, { color: "#FECACA" }]}>{riscos}</Text>
            <Text style={s.hLbl}>em risco</Text>
          </View>
        </View>
      </View>

      {/* Atalho para a fila */}
      <TouchableOpacity style={s.cta} onPress={() => router.push("/(tabs)/(psicologo)/fila-prioridade" as any)} activeOpacity={0.85}>
        <View style={s.ctaIcon}><Ionicons name="pulse" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.ctaTitle}>Fila de prioridade</Text>
          <Text style={s.ctaSub}>Casos de atenção a crítico, ordenados pela IA</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </TouchableOpacity>

      {totalN > 0 && (
        <View style={s.distCard}>
          <Text style={s.distTitle}>Distribuição de saúde da sua empresa</Text>
          <View style={s.distBar}>
            <View style={[s.seg, { flex: bons || 0.01, backgroundColor: "#059669", borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
            <View style={[s.seg, { flex: medios || 0.01, backgroundColor: "#F59E0B" }]} />
            <View style={[s.seg, { flex: riscos || 0.01, backgroundColor: "#EF4444", borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
          </View>
          <View style={s.legRow}>
            {[{ c: "#059669", l: "Saudável", v: bons }, { c: "#F59E0B", l: "Atenção", v: medios }, { c: "#EF4444", l: "Crítico", v: riscos }].map((x, i) => (
              <View key={i} style={s.legItem}><View style={[s.legDot, { backgroundColor: x.c }]} /><Text style={s.legText}>{x.l} ({x.v})</Text></View>
            ))}
          </View>
        </View>
      )}

      {recentAvaliacoes.length > 0 && (
        <>
          <Text style={s.secTitle}>Avaliações recentes</Text>
          {recentAvaliacoes.map((av: any, i: number) => {
            const n = getNivelInfo(av.nivel);
            return (
              <View key={av.id || i} style={[s.rc, { borderLeftColor: n.color }]}>
                <View style={s.rh}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rn}>{av.funcionario_nome}</Text>
                    <Text style={s.rm}>{av.empresa_nome} · Pontuação: {av.pontuacao_total}</Text>
                  </View>
                  <View style={[s.nb, { backgroundColor: n.bg }]}>
                    <Ionicons name={n.icon} size={12} color={n.color} />
                    <Text style={[s.nt, { color: n.color }]}>{n.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

      <View style={s.info}>
        <Ionicons name="lock-closed" size={18} color={colors.primary} />
        <Text style={s.infoT}>Informação clínica confidencial. Você acessa apenas os dados da sua empresa, com dever de sigilo profissional.</Text>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#EEF4F6" },
  cc: { padding: 18, paddingBottom: 30 },
  lc: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#EEF4F6" },

  hero: {
    backgroundColor: colors.primary, borderRadius: 24, padding: 20, overflow: "hidden", marginBottom: 14,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  heroGlow: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(95,191,140,0.22)" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  greet: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  nome: { fontSize: 21, fontWeight: "800", color: "#fff" },
  crp: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  empresaPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 },
  empresaTxt: { fontSize: 12, fontWeight: "800", color: colors.primary, maxWidth: 240 },
  heroStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 16, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 16, paddingVertical: 12 },
  hStat: { alignItems: "center", flex: 1 },
  hNum: { color: "#fff", fontSize: 22, fontWeight: "800" },
  hLbl: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2, fontWeight: "600" },
  hDiv: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.18)" },

  cta: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  ctaIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  ctaTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  ctaSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  distCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  distTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 14 },
  distBar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12 },
  seg: { height: "100%" as any },
  legRow: { flexDirection: "row", justifyContent: "space-between" },
  legItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legDot: { width: 10, height: 10, borderRadius: 3 },
  legText: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  secTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 12 },
  rc: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, borderLeftWidth: 4, shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  rh: { flexDirection: "row", alignItems: "center" },
  rn: { fontSize: 14, fontWeight: "700", color: colors.text },
  rm: { fontSize: 12, color: colors.muted, marginTop: 2 },
  nb: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  nt: { fontSize: 11, fontWeight: "700" },

  info: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#EEF1FF", borderRadius: 14, padding: 14, marginTop: 16 },
  infoT: { flex: 1, fontSize: 12.5, color: "#475569", lineHeight: 19 },
});
