import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

type Pergunta = {
  id: number;
  texto: string;
  ordem: number;
  opcoes: { valor: number; label: string }[];
};

const OPCOES_LABELS: Record<number, string> = {
  1: "Nunca",
  2: "Raramente",
  3: "Às vezes",
  4: "Frequentemente",
  5: "Sempre",
};

const OPCOES_COLORS: Record<number, string> = {
  1: "#16A34A",
  2: "#65A30D",
  3: "#D97706",
  4: "#EA580C",
  5: "#DC2626",
};

export default function ResponderQuestionario() {
  const insets = useSafeAreaInsets();
  const { questionario_id, titulo } = useLocalSearchParams<{
    questionario_id: string;
    titulo: string;
  }>();

  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [perguntaAtual, setPerguntaAtual] = useState(0);

  useEffect(() => {
    carregarPerguntas();
  }, []);

  const carregarPerguntas = async () => {
    try {
      const response = await fetch(
        `${API_ROUTES.perguntasQuestionario}/${questionario_id}/perguntas/`
      );
      if (response.ok) {
        const data = await response.json();
        setPerguntas(data);
      } else {
        appAlert("Erro", "Não foi possível carregar as perguntas.");
        router.back();
      }
    } catch (error) {
      console.log("Erro ao carregar perguntas:", error);
      appAlert("Erro", "Erro ao conectar com o servidor.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const selecionarResposta = (perguntaId: number, valor: number) => {
    setRespostas((prev) => ({ ...prev, [perguntaId]: valor }));
  };

  const proximaPergunta = () => {
    const p = perguntas[perguntaAtual];
    if (!respostas[p.id]) {
      appAlert("Atenção", "Selecione uma resposta antes de continuar.");
      return;
    }
    if (perguntaAtual < perguntas.length - 1) {
      setPerguntaAtual(perguntaAtual + 1);
    }
  };

  const perguntaAnterior = () => {
    if (perguntaAtual > 0) {
      setPerguntaAtual(perguntaAtual - 1);
    }
  };

  const enviarRespostas = async () => {
    const p = perguntas[perguntaAtual];
    if (!respostas[p.id]) {
      appAlert("Atenção", "Selecione uma resposta antes de enviar.");
      return;
    }

    const todasRespondidas = perguntas.every((perg) => respostas[perg.id]);
    if (!todasRespondidas) {
      appAlert("Atenção", "Responda todas as perguntas antes de enviar.");
      return;
    }

    try {
      setEnviando(true);
      const token = await AsyncStorage.getItem("token");

      const respostasArray = perguntas.map((perg) => ({
        pergunta_id: perg.id,
        valor: respostas[perg.id],
      }));

      const response = await fetch(API_ROUTES.responderQuestionario, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          questionario_id: Number(questionario_id),
          respostas: respostasArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        appAlert("Erro", data.erro || "Erro ao enviar respostas.");
        return;
      }

      const nivelMsg =
        data.nivel === "bom"
          ? "Bom - Nível saudável"
          : data.nivel === "medio"
          ? "Médio - Atenção necessária"
          : "Risco - Procure apoio profissional";

      appAlert(
        "Avaliação concluída!",
        `Pontuação: ${data.pontuacao_total}\nNível: ${nivelMsg}\n\n${data.recomendacoes}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.log("Erro ao enviar:", error);
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando perguntas...</Text>
      </View>
    );
  }

  if (perguntas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
        <Text style={styles.loadingText}>Nenhuma pergunta encontrada.</Text>
        <TouchableOpacity style={styles.voltarBtn} onPress={() => router.back()}>
          <Text style={styles.voltarBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pergunta = perguntas[perguntaAtual];
  const progresso = ((perguntaAtual + 1) / perguntas.length) * 100;
  const isUltima = perguntaAtual === perguntas.length - 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => {
          appAlert("Sair", "Deseja sair do questionário? Suas respostas não serão salvas.", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: () => router.back() },
          ]);
        }}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{titulo || "Questionário"}</Text>
        <Text style={styles.headerCount}>
          {perguntaAtual + 1}/{perguntas.length}
        </Text>
      </View>

      {/* Barra de progresso */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progresso}%` }]} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Pergunta */}
        <View style={styles.perguntaCard}>
          <Text style={styles.perguntaNumero}>Pergunta {perguntaAtual + 1}</Text>
          <Text style={styles.perguntaTexto}>{pergunta.texto}</Text>
        </View>

        {/* Opções */}
        <Text style={styles.instrucao}>Selecione a frequência que melhor descreve sua experiência:</Text>

        {[1, 2, 3, 4, 5].map((valor) => {
          const selecionado = respostas[pergunta.id] === valor;
          return (
            <TouchableOpacity
              key={valor}
              style={[
                styles.opcaoCard,
                selecionado && {
                  borderColor: OPCOES_COLORS[valor],
                  borderWidth: 2,
                  backgroundColor: OPCOES_COLORS[valor] + "10",
                },
              ]}
              onPress={() => selecionarResposta(pergunta.id, valor)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.opcaoCircle,
                  selecionado && { backgroundColor: OPCOES_COLORS[valor], borderColor: OPCOES_COLORS[valor] },
                ]}
              >
                {selecionado && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={styles.opcaoContent}>
                <Text style={[styles.opcaoLabel, selecionado && { color: OPCOES_COLORS[valor], fontWeight: "800" }]}>
                  {OPCOES_LABELS[valor]}
                </Text>
              </View>
              <Text style={[styles.opcaoValor, selecionado && { color: OPCOES_COLORS[valor] }]}>
                {valor}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Navegação */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnSecondary, perguntaAtual === 0 && { opacity: 0.4 }]}
          onPress={perguntaAnterior}
          disabled={perguntaAtual === 0}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.navBtnSecondaryText}>Anterior</Text>
        </TouchableOpacity>

        {isUltima ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnPrimary, enviando && { opacity: 0.7 }]}
            onPress={enviarRespostas}
            disabled={enviando}
          >
            <Text style={styles.navBtnPrimaryText}>
              {enviando ? "Enviando..." : "Enviar respostas"}
            </Text>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary]} onPress={proximaPergunta}>
            <Text style={styles.navBtnPrimaryText}>Próxima</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF4F6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#EEF4F6", gap: 12 },
  loadingText: { fontSize: 16, color: colors.muted },
  voltarBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  voltarBtnText: { color: "#fff", fontWeight: "700" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, flex: 1, textAlign: "center", marginHorizontal: 12 },
  headerCount: { fontSize: 15, fontWeight: "700", color: colors.primary },
  progressBar: { height: 4, backgroundColor: "#E2E8F0", marginHorizontal: 20, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 10 },
  perguntaCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, marginBottom: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  perguntaNumero: { fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  perguntaTexto: { fontSize: 18, fontWeight: "600", color: colors.text, lineHeight: 26 },
  instrucao: { fontSize: 13, color: colors.muted, marginBottom: 14 },
  opcaoCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  opcaoCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: "#CBD5E1",
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  opcaoContent: { flex: 1 },
  opcaoLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  opcaoValor: { fontSize: 14, fontWeight: "700", color: "#CBD5E1" },
  navRow: {
    flexDirection: "row", gap: 12, paddingHorizontal: 20,
    paddingVertical: 16, paddingBottom: 30,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: -3 },
  },
  navBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  navBtnPrimary: { backgroundColor: colors.primary },
  navBtnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  navBtnSecondary: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE" },
  navBtnSecondaryText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
});
