import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

export default function PerfilFuncionario() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);

  // Campos editáveis
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.meuPerfilFuncionario, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPerfil(data);
        setTelefone(data.usuario?.telefone || "");
        setEndereco(data.endereco || "");
        setNumero(data.numero || "");
        setBairro(data.bairro || "");
        setCidade(data.cidade || "");
      } else {
        appAlert("Erro", "Não foi possível carregar o perfil.");
      }
    } catch (error) {
      console.log("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const salvarAlteracoes = async () => {
    try {
      setSalvando(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.meuPerfilFuncionario, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          usuario: { telefone },
          endereco,
          numero,
          bairro,
          cidade,
        }),
      });
      if (res.ok) {
        appAlert("Sucesso", "Perfil atualizado!");
        setEditando(false);
        carregarPerfil();
      } else {
        const data = await res.json();
        appAlert("Erro", data.erro || "Erro ao salvar.");
      }
    } catch (error) {
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setSalvando(false);
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

  const nome = perfil?.usuario?.first_name
    ? `${perfil.usuario.first_name} ${perfil.usuario.last_name || ""}`.trim()
    : "Funcionário";

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Ionicons name="person" size={48} color={colors.primary} />
        </View>
        <Text style={styles.name}>{nome}</Text>
        <Text style={styles.email}>{perfil?.usuario?.email || ""}</Text>
        <Text style={styles.cargoTag}>{perfil?.cargo || "Funcionário"}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Informações pessoais</Text>
          <TouchableOpacity onPress={() => setEditando(!editando)}>
            <Ionicons name={editando ? "close-circle" : "create-outline"} size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <InfoRow icon="person-outline" label="Nome" value={nome} />
        <InfoRow icon="mail-outline" label="Email" value={perfil?.usuario?.email} />
        <InfoRow icon="card-outline" label="CPF" value={perfil?.cpf || "***.***.***-**"} />
        <InfoRow icon="business-outline" label="Empresa" value={perfil?.empresa_nome} />
        <InfoRow icon="briefcase-outline" label="Cargo" value={perfil?.cargo} />
        <InfoRow icon="layers-outline" label="Departamento" value={perfil?.departamento || "Não informado"} />

        {editando ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.editTitle}>Editar dados</Text>
            <EditField label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
            <EditField label="Endereço" value={endereco} onChangeText={setEndereco} />
            <EditField label="Número" value={numero} onChangeText={setNumero} />
            <EditField label="Bairro" value={bairro} onChangeText={setBairro} />
            <EditField label="Cidade" value={cidade} onChangeText={setCidade} />
            <TouchableOpacity
              style={[styles.saveButton, salvando && { opacity: 0.7 }]}
              onPress={salvarAlteracoes}
              disabled={salvando}
            >
              <Text style={styles.saveText}>{salvando ? "Salvando..." : "Salvar alterações"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <InfoRow icon="call-outline" label="Telefone" value={perfil?.usuario?.telefone || "Não informado"} />
            <InfoRow icon="location-outline" label="Endereço" value={perfil?.endereco ? `${perfil.endereco}, ${perfil.numero} - ${perfil.bairro}` : "Não informado"} />
            <InfoRow icon="map-outline" label="Cidade" value={perfil?.cidade ? `${perfil.cidade} - ${perfil.estado}` : "Não informado"} />
          </>
        )}
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

function EditField({ label, value, onChangeText, keyboardType }: any) {
  return (
    <View style={styles.editFieldWrap}>
      <Text style={styles.editFieldLabel}>{label}</Text>
      <TextInput
        style={styles.editFieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
      />
    </View>
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
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },
  cargoTag: {
    marginTop: 8, backgroundColor: colors.primary + "15", color: colors.primary,
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, fontWeight: "700", fontSize: 13, overflow: "hidden",
  },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 20,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 6 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  editTitle: { fontSize: 16, fontWeight: "700", color: colors.primary, marginBottom: 12 },
  editFieldWrap: { marginBottom: 12 },
  editFieldLabel: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 4 },
  editFieldInput: {
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  saveButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#FEE2E2", paddingVertical: 14, borderRadius: 14,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "700" },
});
