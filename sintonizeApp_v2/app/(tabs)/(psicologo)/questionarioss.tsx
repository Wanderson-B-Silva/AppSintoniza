import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

type Questionario = {
  id: number;
  titulo: string;
  descricao: string;
  total_perguntas: number;
};

export default function QuestionariosPsicologo() {
  const insets = useSafeAreaInsets();
  const [questionarios, setQuestionarios] = useState<Questionario[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarQuestionarios = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ROUTES.listarQuestionarios);
      if (res.ok) {
        const data = await res.json();
        setQuestionarios(data);
      }
    } catch (error) {
      console.log("Erro ao carregar questionários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarQuestionarios();
  }, []);

  // Recarregar ao voltar para esta tela
  useFocusEffect(
    useCallback(() => {
      carregarQuestionarios();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Questionários</Text>
      <Text style={styles.subtitle}>
        Gerencie os questionários disponíveis para os funcionários.
      </Text>

      <TouchableOpacity
        style={styles.newButton}
        onPress={() => router.push("/novo-questionario")}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.newButtonText}>Criar novo questionário</Text>
      </TouchableOpacity>

      {questionarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhum questionário cadastrado.</Text>
          <Text style={styles.emptySubtext}>Crie o primeiro questionário para começar.</Text>
        </View>
      ) : (
        questionarios.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="document-text" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                {item.descricao ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.descricao}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.metaBadge}>
                <Ionicons name="help-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.metaText}>{item.total_perguntas} perguntas</Text>
              </View>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Ativo</Text>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={styles.statsCard}>
        <Ionicons name="analytics-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statsTitle}>Total de questionários</Text>
          <Text style={styles.statsValue}>{questionarios.length}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 50, backgroundColor: "#EEF4F6", flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: colors.primary, marginBottom: 8 },
  subtitle: { color: colors.muted, marginBottom: 20 },
  newButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.mint, paddingVertical: 14, borderRadius: 14, marginBottom: 20,
  },
  newButtonText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  emptyContainer: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.muted },
  emptySubtext: { fontSize: 14, color: "#94A3B8", textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" },
  activeText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  statsCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginTop: 10,
    shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statsTitle: { fontSize: 13, color: colors.muted },
  statsValue: { fontSize: 22, fontWeight: "800", color: colors.text },
});
