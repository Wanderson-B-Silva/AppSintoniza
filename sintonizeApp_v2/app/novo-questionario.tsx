import React, { useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { appAlert } from "../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";
import { API_ROUTES } from "../services/api";

type PerguntaForm = {
  texto: string;
  peso: number;
};

export default function NovoQuestionario() {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([
    { texto: "", peso: 1 },
    { texto: "", peso: 1 },
    { texto: "", peso: 1 },
  ]);
  const [salvando, setSalvando] = useState(false);

  const adicionarPergunta = () => {
    setPerguntas([...perguntas, { texto: "", peso: 1 }]);
  };

  const removerPergunta = (index: number) => {
    if (perguntas.length <= 1) {
      appAlert("Atenção", "O questionário precisa ter pelo menos 1 pergunta.");
      return;
    }
    setPerguntas(perguntas.filter((_, i) => i !== index));
  };

  const atualizarPergunta = (index: number, campo: keyof PerguntaForm, valor: any) => {
    const novas = [...perguntas];
    (novas[index] as any)[campo] = valor;
    setPerguntas(novas);
  };

  const salvarQuestionario = async () => {
    if (!titulo.trim()) {
      appAlert("Atenção", "Informe o título do questionário.");
      return;
    }

    const perguntasValidas = perguntas.filter((p) => p.texto.trim() !== "");
    if (perguntasValidas.length === 0) {
      appAlert("Atenção", "Adicione pelo menos uma pergunta com texto.");
      return;
    }

    try {
      setSalvando(true);
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(API_ROUTES.criarQuestionario, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          perguntas: perguntasValidas.map((p) => ({
            texto: p.texto.trim(),
            peso: p.peso,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        appAlert("Erro", data.erro || "Não foi possível criar o questionário.");
        return;
      }

      appAlert(
        "Sucesso!",
        `Questionário "${data.titulo}" criado com ${data.total_perguntas} perguntas.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.log("Erro ao salvar:", error);
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Novo questionário</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionLabel}>Informações do questionário</Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Título *</Text>
        <TextInput
          placeholder="Ex: Avaliação de bem-estar"
          value={titulo}
          onChangeText={setTitulo}
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          placeholder="Breve descrição do questionário"
          value={descricao}
          onChangeText={setDescricao}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.perguntasHeader}>
        <Text style={styles.sectionLabel}>Perguntas ({perguntas.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={adicionarPergunta}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        As respostas seguirão a escala: Nunca (1) / Raramente (2) / Às vezes (3) / Frequentemente (4) / Sempre (5)
      </Text>

      {perguntas.map((p, index) => (
        <View key={index} style={styles.perguntaCard}>
          <View style={styles.perguntaHeader}>
            <Text style={styles.perguntaNum}>Pergunta {index + 1}</Text>
            <TouchableOpacity onPress={() => removerPergunta(index)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Digite a pergunta"
            value={p.texto}
            onChangeText={(t) => atualizarPergunta(index, "texto", t)}
            style={styles.input}
            multiline
            placeholderTextColor="#94A3B8"
          />

          <View style={styles.pesoRow}>
            <Text style={styles.pesoLabel}>Peso:</Text>
            {[1, 2, 3, 4, 5].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.pesoBadge, p.peso === v && styles.pesoBadgeActive]}
                onPress={() => atualizarPergunta(index, "peso", v)}
              >
                <Text style={[styles.pesoText, p.peso === v && styles.pesoTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, salvando && { opacity: 0.7 }]}
        onPress={salvarQuestionario}
        disabled={salvando}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveText}>
          {salvando ? "Salvando..." : "Salvar questionário"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 50, backgroundColor: "#EEF4F6", flexGrow: 1, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "800", color: colors.primary },
  sectionLabel: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 12 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  perguntasHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.mint, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 18 },
  perguntaCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  perguntaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  perguntaNum: { fontSize: 14, fontWeight: "700", color: colors.primary },
  pesoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  pesoLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  pesoBadge: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: "#CBD5E1",
    alignItems: "center", justifyContent: "center",
  },
  pesoBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pesoText: { fontSize: 14, fontWeight: "700", color: colors.text },
  pesoTextActive: { color: "#fff" },
  saveButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 14, marginTop: 20,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
