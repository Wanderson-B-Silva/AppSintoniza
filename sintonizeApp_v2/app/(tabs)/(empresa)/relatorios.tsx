import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";
import { Card } from "../../../components/Card";
import {
  BarChart,
  StackedBar,
  KpiBadge,
  ProgressRow,
  LegendDot,
} from "../../../components/charts/Charts";
import { createTabBarScrollHandler } from "../../../components/tabBarStore";

const handleTabScroll = createTabBarScrollHandler();

type Dashboard = {
  total_funcionarios?: number;
  total_avaliados?: number;
  sem_avaliacao?: number;
  niveis?: { bom: number; medio: number; risco: number };
  taxa_bem_estar?: number;
  saude_departamentos?: any[];
};

export default function RelatoriosEmpresa() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Dashboard | null>(null);

  const carregar = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.dashboardEmpresa, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.log("Erro relatórios:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const niveis = data?.niveis || { bom: 0, medio: 0, risco: 0 };
  const totalAval = niveis.bom + niveis.medio + niveis.risco;
  const totalFunc = data?.total_funcionarios || 0;
  const semAval = data?.sem_avaliacao ?? Math.max(0, totalFunc - totalAval);
  const taxa =
    data?.taxa_bem_estar ??
    (totalAval > 0 ? Math.round((niveis.bom / totalAval) * 100) : 0);
  const cobertura = totalFunc > 0 ? Math.round((totalAval / totalFunc) * 100) : 0;

  const deptos = (data?.saude_departamentos || []).filter((d: any) => d?.total > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      onScroll={handleTabScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            carregar();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.h1}>Relatórios</Text>
        <Text style={styles.sub}>Indicadores de saúde mental da equipe</Text>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiCard icon="people" color={colors.primary} value={totalFunc} label="Colaboradores" />
        <KpiCard icon="checkmark-done" color={colors.success} value={`${cobertura}%`} label="Cobertura" />
      </View>

      {/* Índice de bem-estar */}
      <Card style={styles.card} elevation="md">
        <Text style={styles.cardTitle}>Índice de Bem-estar</Text>
        <Text style={styles.cardSub}>Percentual de colaboradores saudáveis</Text>
        <View style={styles.wellRow}>
          <KpiBadge value={taxa} label="" color={colors.healthGood} size={128} />
          <View style={{ flex: 1 }}>
            <ProgressRow label="Saudável" value={niveis.bom} total={totalAval} color={colors.healthGood} />
            <ProgressRow label="Atenção" value={niveis.medio} total={totalAval} color={colors.healthMid} />
            <ProgressRow label="Crítico" value={niveis.risco} total={totalAval} color={colors.healthRisk} />
          </View>
        </View>
      </Card>

      {/* Distribuição geral */}
      <Card style={styles.card} elevation="sm">
        <Text style={styles.cardTitle}>Distribuição das Avaliações</Text>
        <Text style={styles.cardSub}>{totalAval} de {totalFunc} colaboradores avaliados</Text>
        <BarChart
          data={[
            { label: "Saudável", value: niveis.bom, color: colors.healthGood },
            { label: "Atenção", value: niveis.medio, color: colors.healthMid },
            { label: "Crítico", value: niveis.risco, color: colors.healthRisk },
            { label: "Sem aval.", value: semAval, color: colors.subtle },
          ]}
        />
      </Card>

      {/* Por departamento */}
      <Text style={styles.section}>Saúde por Departamento</Text>
      {deptos.length === 0 ? (
        <Card style={styles.empty} elevation="xs">
          <Ionicons name="bar-chart-outline" size={42} color={colors.border} />
          <Text style={styles.emptyText}>Sem dados de departamento ainda</Text>
        </Card>
      ) : (
        deptos.map((d: any, i: number) => (
          <Card key={i} style={styles.deptCard} elevation="xs">
            <View style={styles.deptHead}>
              <Text style={styles.deptName}>{d.departamento || "—"}</Text>
              <Text style={styles.deptTotal}>{d.total} pessoas</Text>
            </View>
            <StackedBar
              height={12}
              segments={[
                { value: d.bom || 0, color: colors.healthGood },
                { value: d.medio || 0, color: colors.healthMid },
                { value: d.risco || 0, color: colors.healthRisk },
              ]}
            />
            <View style={styles.deptLegend}>
              <LegendDot color={colors.healthGood} label="" value={d.bom || 0} />
              <LegendDot color={colors.healthMid} label="" value={d.medio || 0} />
              <LegendDot color={colors.healthRisk} label="" value={d.risco || 0} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function KpiCard({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card style={styles.kpiCard} elevation="sm">
      <View style={[styles.kpiIcon, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  content: { padding: 20, paddingTop: 50, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgSoft },

  header: { marginBottom: 18 },
  h1: { fontSize: 28, fontWeight: "900", color: colors.primary },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },

  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, alignItems: "center" },
  kpiIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiValue: { fontSize: 26, fontWeight: "900", color: colors.textStrong },
  kpiLabel: { fontSize: 12, color: colors.muted, fontWeight: "600", marginTop: 2 },

  card: { marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.textStrong, marginBottom: 2 },
  cardSub: { fontSize: 12, color: colors.muted, marginBottom: 18 },

  wellRow: { flexDirection: "row", alignItems: "center", gap: 18 },

  section: { fontSize: 18, fontWeight: "800", color: colors.textStrong, marginTop: 8, marginBottom: 12 },

  deptCard: { marginBottom: 10 },
  deptHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  deptName: { fontSize: 14, fontWeight: "700", color: colors.textStrong },
  deptTotal: { fontSize: 12, color: colors.muted },
  deptLegend: { flexDirection: "row", gap: 20, marginTop: 10 },

  empty: { alignItems: "center", paddingVertical: 36 },
  emptyText: { fontSize: 14, color: colors.muted, marginTop: 10, fontWeight: "600" },
});
