import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { ScreenBg } from "../../../components/ScreenBg";
import { API_ROUTES } from "../../../services/api";
import { Card } from "../../../components/Card";
import {
  StackedBar,
  KpiBadge,
  LegendDot,
  ProgressRow,
} from "../../../components/charts/Charts";
import { createTabBarScrollHandler } from "../../../components/tabBarStore";

const handleTabScroll = createTabBarScrollHandler();

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type DashboardData = {
  total_funcionarios: number;
  total_avaliados: number;
  sem_avaliacao: number;
  niveis: { bom: number; medio: number; risco: number };
  taxa_bem_estar: number;
  funcionarios_risco: any[];
  saude_departamentos: any[];
  saude_individual: any[];
  total_em_risco?: number;
  total_em_atencao?: number;
  alerta_anonimo?: { em_risco: number; em_atencao: number; mensagem: string } | null;
  privacidade?: { anonimizado: boolean; min_grupo: number; mensagem: string };
};

const NIVEL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  bom: { label: "Saudável", color: "#059669", bg: "#D1FAE5", icon: "checkmark-circle" },
  medio: { label: "Atenção", color: "#D97706", bg: "#FEF3C7", icon: "alert-circle" },
  risco: { label: "Crítico", color: "#DC2626", bg: "#FEE2E2", icon: "warning" },
};

export default function TelaInicialEmpresa() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState("Empresa");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, ativos: 0 });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [humor, setHumor] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "saude" | "alertas">("overview");

  const carregarDados = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      // Perfil
      const perfilRes = await fetch(API_ROUTES.perfil, {
        headers: { Authorization: `Token ${token}` },
      });
      if (perfilRes.ok) {
        const perfil = await perfilRes.json();
        setNome(perfil.empresa?.razao_social || perfil.empresa?.nome_fantasia || perfil.first_name || "Empresa");
      }

      // Funcionários
      const funcRes = await fetch(API_ROUTES.listaFuncionariosEmpresa, {
        headers: { Authorization: `Token ${token}` },
      });
      if (funcRes.ok) {
        const funcData = await funcRes.json();
        const total = funcData.total || 0;
        const ativos = (funcData.funcionarios || []).filter((f: any) => f.ativo).length;
        setStats({ total, ativos });
      }

      // Dashboard de saúde
      const dashRes = await fetch(API_ROUTES.dashboardEmpresa, {
        headers: { Authorization: `Token ${token}` },
      });
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboard(dashData);
      }

      // Clima emocional (check-ins agregados)
      try {
        const humorRes = await fetch(API_ROUTES.humorEmpresa, {
          headers: { Authorization: `Token ${token}` },
        });
        if (humorRes.ok) {
          setHumor(await humorRes.json());
        }
      } catch {}
    } catch (error) {
      console.log("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

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

  const niveis = dashboard?.niveis || { bom: 0, medio: 0, risco: 0 };
  const totalAvaliados = niveis.bom + niveis.medio + niveis.risco;

  return (
    <ScreenBg>
    <ScrollView style={[styles.container, { backgroundColor: "transparent" }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]} onScroll={handleTabScroll} scrollEventThrottle={16}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="business" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Painel da empresa</Text>
            <Text style={styles.empresaNome} numberOfLines={1}>{nome}</Text>
          </View>
          <TouchableOpacity onPress={fazerLogout} style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.privacyBadge}>
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
          <Text style={styles.privacyBadgeTxt}>Painel anônimo — dados agregados, sem identificar pessoas</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        {[
          { key: "overview", label: "Visão Geral", icon: "grid-outline" },
          { key: "saude", label: "Saúde", icon: "heart-outline" },
          { key: "alertas", label: "Alertas", icon: "notifications-outline" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? "#fff" : colors.muted}
            />
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "overview" && (
        <>
          {/* Metric Cards */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderLeftColor: colors.primary }]}>
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={styles.metricValue}>{stats.total}</Text>
              <Text style={styles.metricLabel}>Funcionários</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.metricValue}>{dashboard?.total_avaliados || 0}</Text>
              <Text style={styles.metricLabel}>Avaliados</Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderLeftColor: colors.danger }]}>
              <Ionicons name="warning" size={24} color={colors.danger} />
              <Text style={styles.metricValue}>{niveis.risco}</Text>
              <Text style={styles.metricLabel}>Em Risco</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: "#059669" }]}>
              <Ionicons name="trending-up" size={24} color="#059669" />
              <Text style={styles.metricValue}>{dashboard?.taxa_bem_estar || 0}%</Text>
              <Text style={styles.metricLabel}>Bem-estar</Text>
            </View>
          </View>

          {/* Panorama de Saúde Mental */}
          {totalAvaliados > 0 && (
            <Card style={styles.healthCard} elevation="md">
              <Text style={styles.chartTitle}>Panorama de Saúde Mental</Text>
              <Text style={styles.chartSub}>
                Distribuição da última avaliação por colaborador
              </Text>

              <View style={styles.healthTop}>
                <KpiBadge
                  value={
                    dashboard?.taxa_bem_estar ??
                    Math.round((niveis.bom / totalAvaliados) * 100)
                  }
                  label="Bem-estar"
                  color={colors.healthGood}
                />
                <View style={styles.healthRows}>
                  <ProgressRow label="Saudável" value={niveis.bom} total={totalAvaliados} color={colors.healthGood} />
                  <ProgressRow label="Atenção" value={niveis.medio} total={totalAvaliados} color={colors.healthMid} />
                  <ProgressRow label="Crítico" value={niveis.risco} total={totalAvaliados} color={colors.healthRisk} />
                </View>
              </View>

              <StackedBar
                height={16}
                segments={[
                  { value: niveis.bom, color: colors.healthGood },
                  { value: niveis.medio, color: colors.healthMid },
                  { value: niveis.risco, color: colors.healthRisk },
                ]}
              />
              <View style={styles.legendRow}>
                <LegendDot color={colors.healthGood} label="Saudável" value={niveis.bom} />
                <LegendDot color={colors.healthMid} label="Atenção" value={niveis.medio} />
                <LegendDot color={colors.healthRisk} label="Crítico" value={niveis.risco} />
              </View>
            </Card>
          )}

          {/* Clima emocional da equipe (check-ins) */}
          {humor && humor.total_checkins > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Clima emocional da equipe</Text>
              <Text style={styles.chartSub}>
                {humor.total_checkins} check-ins · média {humor.media_bem_estar}/5
              </Text>
              {humor.distribuicao.map((d: any) => {
                const cor =
                  d.humor === "bem" || d.humor === "motivado" ? "#059669" :
                  d.humor === "cansado" ? "#D97706" : "#DC2626";
                return (
                  <View key={d.humor} style={styles.humorRow}>
                    <Text style={styles.humorLabel}>{d.label}</Text>
                    <View style={styles.humorBarBg}>
                      <View style={[styles.humorBarFill, { width: `${d.percentual}%`, backgroundColor: cor }]} />
                    </View>
                    <Text style={styles.humorPct}>{d.percentual}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <Text style={styles.sectionTitle}>Ações rápidas</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/(empresa)/listar-funcionario")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="list" size={22} color={colors.info} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Listar Funcionários</Text>
              <Text style={styles.actionDesc}>Visualize, edite ou exclua funcionários</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(auth)/register-cli?origin=empresa")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="person-add" size={22} color={colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Cadastrar Funcionário</Text>
              <Text style={styles.actionDesc}>Adicione um novo funcionário à empresa</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </>
      )}

      {activeTab === "saude" && (
        <>
          <Text style={styles.sectionTitle}>Saúde por Departamento</Text>
          {(dashboard?.saude_departamentos || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhum dado de departamento disponível</Text>
            </View>
          ) : (
            (dashboard?.saude_departamentos || []).map((dept: any, i: number) => (
              <View key={i} style={styles.deptCard}>
                <View style={styles.deptHeader}>
                  <Text style={styles.deptName}>{dept.departamento}</Text>
                  <Text style={styles.deptTotal}>{dept.total} pessoas</Text>
                </View>
                <View style={styles.deptBar}>
                  {dept.total > 0 && (
                    <View style={styles.deptBarInner}>
                      <View style={[styles.barSegment, { flex: dept.bom || 0.01, backgroundColor: "#059669", borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }]} />
                      <View style={[styles.barSegment, { flex: dept.medio || 0.01, backgroundColor: "#F59E0B" }]} />
                      <View style={[styles.barSegment, { flex: dept.risco || 0.01, backgroundColor: "#EF4444", borderTopRightRadius: 5, borderBottomRightRadius: 5 }]} />
                    </View>
                  )}
                </View>
                <View style={styles.deptLegend}>
                  <Text style={{ fontSize: 11, color: "#059669" }}>✓ {dept.bom}</Text>
                  <Text style={{ fontSize: 11, color: "#D97706" }}>! {dept.medio}</Text>
                  <Text style={{ fontSize: 11, color: "#DC2626" }}>⚠ {dept.risco}</Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <Text style={styles.privacyTitle}>Dados individuais protegidos</Text>
            <Text style={styles.privacyText}>
              {dashboard?.privacidade?.mensagem ||
                "Os dados de saúde mental são exibidos de forma agregada e anônima. A empresa não tem acesso ao diagnóstico individual de nenhum colaborador."}
            </Text>
            <Text style={styles.privacyNote}>
              O acompanhamento de casos específicos é feito apenas pelo psicólogo
              responsável, que tem dever de sigilo profissional.
            </Text>
          </View>
        </>
      )}

      {activeTab === "alertas" && (
        <>
          <Text style={styles.sectionTitle}>Alerta coletivo de bem-estar</Text>
          {!dashboard?.alerta_anonimo ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={56} color="#059669" />
              <Text style={[styles.emptyText, { color: "#059669" }]}>Nenhum alerta ativo!</Text>
              <Text style={styles.emptySubtext}>A equipe avaliada está com o bem-estar em dia.</Text>
            </View>
          ) : (
            <>
              <View style={styles.alertResumoRow}>
                <View style={[styles.alertResumoCard, { borderTopColor: "#DC2626" }]}>
                  <Text style={[styles.alertResumoNum, { color: "#DC2626" }]}>
                    {dashboard.alerta_anonimo.em_risco}
                  </Text>
                  <Text style={styles.alertResumoLabel}>em risco</Text>
                </View>
                <View style={[styles.alertResumoCard, { borderTopColor: "#D97706" }]}>
                  <Text style={[styles.alertResumoNum, { color: "#D97706" }]}>
                    {dashboard.alerta_anonimo.em_atencao}
                  </Text>
                  <Text style={styles.alertResumoLabel}>em atenção</Text>
                </View>
              </View>

              <View style={styles.alertCard}>
                <View style={styles.alertRecBox}>
                  <Ionicons name="bulb-outline" size={18} color="#D97706" />
                  <Text style={styles.alertRecText}>
                    {dashboard.alerta_anonimo.mensagem}
                  </Text>
                </View>
              </View>

              <View style={styles.privacyCard}>
                <View style={styles.privacyIcon}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                </View>
                <Text style={styles.privacyTitle}>Por que não mostramos nomes?</Text>
                <Text style={styles.privacyText}>
                  A identidade de quem precisa de apoio é confidencial e tratada
                  somente pelo psicólogo responsável. À gestão cabe agir sobre o
                  ambiente — comunicação, carga de trabalho e canais de apoio.
                </Text>
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { padding: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },

  // Header / Hero
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 40, marginBottom: 24 },
  hero: {
    backgroundColor: colors.primary, borderRadius: 24, padding: 20, overflow: "hidden", marginBottom: 16,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  heroGlow: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(95,191,140,0.22)" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  privacyBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 14, alignSelf: "flex-start" },
  privacyBadgeTxt: { fontSize: 11.5, fontWeight: "700", color: colors.primary, maxWidth: 280 },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  empresaNome: { fontSize: 20, fontWeight: "800", color: "#fff" },
  logoutIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center", justifyContent: "center",
  },

  // Tabs
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 20, backgroundColor: "#E2E8F0", borderRadius: 14, padding: 4 },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.muted },
  tabTextActive: { color: "#fff" },

  // Metrics
  metricsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  metricCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderLeftWidth: 4, alignItems: "center",
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  metricValue: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginTop: 6 },
  metricLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: "600" },

  // Chart Card
  chartCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  chartTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  chartSub: { fontSize: 12, color: colors.muted, marginBottom: 20 },

  healthCard: { marginBottom: 20 },
  healthTop: { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 18 },
  healthRows: { flex: 1 },
  legendRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },

  donutRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  donutItem: { alignItems: "center" },
  donutCircle: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 5,
    alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", marginBottom: 8,
  },
  donutPct: { fontSize: 18, fontWeight: "800" },
  donutLabel: { fontSize: 13, fontWeight: "700" },
  donutCount: { fontSize: 11, color: colors.muted, marginTop: 2 },

  barContainer: { marginTop: 4 },
  barRow: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" },
  barSegment: { height: "100%" },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 14 },

  // Actions
  actionCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 10,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  actionContent: { flex: 1 },
  humorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  humorLabel: { width: 70, fontSize: 13, color: colors.text, fontWeight: "600" },
  humorBarBg: { flex: 1, height: 12, borderRadius: 6, backgroundColor: "#EEF2F6", overflow: "hidden" },
  humorBarFill: { height: 12, borderRadius: 6 },
  humorPct: { width: 42, textAlign: "right", fontSize: 12, color: colors.muted, fontWeight: "600" },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  actionDesc: { fontSize: 12, color: colors.muted },

  // Empty
  emptyCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 40, alignItems: "center",
    shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  emptyText: { fontSize: 15, fontWeight: "700", color: colors.muted, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "#94A3B8", marginTop: 4, textAlign: "center" },

  // Dept cards
  deptCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  deptHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  deptName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  deptTotal: { fontSize: 12, color: colors.muted },
  deptBar: { marginBottom: 8 },
  deptBarInner: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: "#F1F5F9" },
  deptLegend: { flexDirection: "row", gap: 16 },

  // Individual
  individualCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: "#0F172A", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  individualAvatar: {
    width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  individualInitial: { fontSize: 16, fontWeight: "800" },
  individualName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  individualRole: { fontSize: 12, color: colors.muted },
  nivelBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  nivelText: { fontSize: 11, fontWeight: "700" },
  semAvaliacao: { fontSize: 11, color: "#94A3B8" },

  // Alert cards
  alertCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: "#DC2626",
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  alertName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  alertMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  alertRecBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12,
  },
  alertRecText: { flex: 1, fontSize: 13, color: "#991B1B", lineHeight: 20 },

  // Privacidade / anonimato
  privacyCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20, marginTop: 8,
    borderWidth: 1, borderColor: "#E6EAFE",
    shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  privacyIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF1FF",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  privacyTitle: { fontSize: 16, fontWeight: "800", color: colors.primary, marginBottom: 6 },
  privacyText: { fontSize: 13, color: "#475569", lineHeight: 20 },
  privacyNote: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 8, fontStyle: "italic" },

  // Resumo de alertas (anônimo)
  alertResumoRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  alertResumoCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", borderTopWidth: 3,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  alertResumoNum: { fontSize: 28, fontWeight: "800" },
  alertResumoLabel: { fontSize: 12, color: colors.muted, fontWeight: "700", marginTop: 2 },
});
