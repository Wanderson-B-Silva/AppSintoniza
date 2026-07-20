import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";
import { ScreenHeader } from "../../../components/ScreenHeader";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useFeedback } from "../../../components/Feedback";
import { createTabBarScrollHandler } from "../../../components/tabBarStore";

const handleTabScroll = createTabBarScrollHandler();

type Funcionario = {
  id: number;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;
  matricula: string;
  cidade: string;
  estado: string;
  ativo: boolean;
};

export default function ListarFuncionarios() {
  const insets = useSafeAreaInsets();
  const { toast, confirm } = useFeedback();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      console.log("TOKEN LISTA:", token);
      console.log("URL LISTA:", API_ROUTES.listaFuncionariosEmpresa);

      const response = await fetch(API_ROUTES.listaFuncionariosEmpresa, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      });

      const raw = await response.text();
      console.log("STATUS LISTA:", response.status);
      console.log("RESPOSTA LISTA:", raw);

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { erro: raw || "Resposta inválida do servidor" };
      }

      if (!response.ok) {
        toast(data.erro || "Erro ao carregar funcionários.", "error");
        return;
      }

      setFuncionarios(data.funcionarios || []);
    } catch (error) {
      console.log("ERRO LISTA:", error);
      toast("Erro ao conectar com o servidor.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const excluirFuncionario = async (id: number) => {
    const ok = await confirm({
      title: "Excluir funcionário",
      message: "Deseja realmente marcar este funcionário como excluído? (exclusão lógica)",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(
        `${API_ROUTES.excluirFuncionario}/${id}/excluir/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { erro: raw || "Resposta inválida do servidor" };
      }

      if (!response.ok) {
        toast(data.erro || "Não foi possível excluir.", "error");
        return;
      }

      toast("Funcionário marcado como excluído.", "success");
      carregarFuncionarios();
    } catch (error) {
      toast("Erro ao excluir funcionário.", "error");
    }
  };

  const renderItem = ({ item }: { item: Funcionario }) => (
    <View style={[styles.card, !item.ativo && styles.cardInativo]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarSmall}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>
            {item.nome} {item.sobrenome}
          </Text>
          <Text style={styles.cargo}>{item.cargo}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.ativo ? "#DCFCE7" : "#FEE2E2" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.ativo ? "#166534" : "#991B1B" },
            ]}
          >
            {item.ativo ? "Ativo" : "Inativo"}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="mail-outline" size={15} color={colors.muted} />
        <Text style={styles.info}>{item.email}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="call-outline" size={15} color={colors.muted} />
        <Text style={styles.info}>{item.telefone || "Não informado"}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="business-outline" size={15} color={colors.muted} />
        <Text style={styles.info}>
          {item.departamento || "Dept. não informado"}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={15} color={colors.muted} />
        <Text style={styles.info}>
          {item.cidade} - {item.estado}
        </Text>
      </View>

      <View style={styles.acoes}>
        <TouchableOpacity
          style={styles.botaoEditar}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/(empresa)/editar-funcionario",
              params: { id: String(item.id) },
            })
          }
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.textoEditar}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoExcluir}
          onPress={() => excluirFuncionario(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          <Text style={styles.textoExcluir}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader
        title="Funcionários"
        subtitle={`${funcionarios.length} cadastrado(s)`}
        back={false}
        action={{
          icon: "person-add",
          onPress: () => router.push("/(auth)/register-cli?origin=empresa"),
          color: "#fff",
          bg: colors.primary,
        }}
      />

      {funcionarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado.</Text>
          <View style={{ width: "70%", marginTop: 18 }}>
            <PrimaryButton
              title="Cadastrar funcionário"
              icon="person-add"
              onPress={() => router.push("/(auth)/register-cli?origin=empresa")}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={funcionarios}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                carregarFuncionarios();
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#EEF4F6",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF4F6",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#374151",
  },
  lista: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardInativo: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cargo: {
    fontSize: 13,
    color: colors.muted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: "#374151",
  },
  acoes: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  botaoEditar: {
    flex: 1,
    backgroundColor: colors.info,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  textoEditar: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  botaoExcluir: {
    flex: 1,
    backgroundColor: colors.danger,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  textoExcluir: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
});