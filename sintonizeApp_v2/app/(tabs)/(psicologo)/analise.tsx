import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

type AvaliacaoItem = {
  id: number;
  funcionario_id: number;
  funcionario_nome: string;
  empresa_nome: string;
  data_avaliacao: string;
  pontuacao_total: number;
  nivel: string;
  nivel_display: string;
  recomendacoes: string;
};

export default function AnalisesPsicologo() {
  const insets = useSafeAreaInsets();
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [detalhes, setDetalhes] = useState<any>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Parecer do psicólogo
  const [parecerTexto, setParecerTexto] = useState("");
  const [nivelAtencao, setNivelAtencao] = useState("rotina");
  const [encaminhamento, setEncaminhamento] = useState("");
  const [necessita, setNecessita] = useState(false);
  const [salvandoParecer, setSalvandoParecer] = useState(false);
  const [parecerExistente, setParecerExistente] = useState(false);

  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  const carregarAvaliacoes = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.avaliacoesPsicologo, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvaliacoes(data.avaliacoes || []);
      } else {
        const data = await res.json();
        appAlert("Erro", data.erro || "Erro ao carregar avaliações.");
      }
    } catch (error) {
      console.log("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalhe = async (avaliacaoId: number) => {
    try {
      setLoadingDetalhe(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.detalheAvaliacaoPsicologo}/${avaliacaoId}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetalhes(data);
        // Preenche o formulário de parecer se já existir
        if (data.parecer) {
          setParecerTexto(data.parecer.parecer || "");
          setNivelAtencao(data.parecer.nivel_atencao || "rotina");
          setEncaminhamento(data.parecer.encaminhamento || "");
          setNecessita(!!data.parecer.necessita_acompanhamento);
          setParecerExistente(true);
        } else {
          setParecerTexto("");
          setNivelAtencao("rotina");
          setEncaminhamento("");
          setNecessita(false);
          setParecerExistente(false);
        }
      } else {
        appAlert("Erro", "Não foi possível carregar os detalhes.");
      }
    } catch (error) {
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const salvarParecer = async () => {
    if (!parecerTexto.trim()) {
      appAlert("Atenção", "Escreva o parecer antes de salvar.");
      return;
    }
    if (!detalhes?.avaliacao?.id) return;
    try {
      setSalvandoParecer(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(
        `${API_ROUTES.criarParecer}/${detalhes.avaliacao.id}/parecer/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            parecer: parecerTexto.trim(),
            nivel_atencao: nivelAtencao,
            encaminhamento: encaminhamento.trim(),
            necessita_acompanhamento: necessita,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setParecerExistente(true);
        appAlert("Sucesso", data.mensagem || "Parecer salvo!");
      } else {
        appAlert("Erro", data.erro || "Não foi possível salvar o parecer.");
      }
    } catch (error) {
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setSalvandoParecer(false);
    }
  };

  const resultados = useMemo(() => {
    return avaliacoes.filter((item) => {
      const textoOk =
        item.funcionario_nome.toLowerCase().includes(filtro.toLowerCase()) ||
        item.empresa_nome.toLowerCase().includes(filtro.toLowerCase());
      const statusOk = statusFiltro === "todos" ? true : item.nivel === statusFiltro;
      return textoOk && statusOk;
    });
  }, [filtro, statusFiltro, avaliacoes]);

  const getNivelInfo = (nivel: string) => {
    switch (nivel) {
      case "bom": return { color: "#16A34A", bg: "#DCFCE7", label: "Bom" };
      case "medio": return { color: "#D97706", bg: "#FEF3C7", label: "Atenção" };
      case "risco": return { color: "#DC2626", bg: "#FEE2E2", label: "Risco" };
      default: return { color: colors.muted, bg: "#F1F5F9", label: nivel };
    }
  };

  const formatarData = (data: string) => {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Tela de detalhes
  if (detalhes) {
    const av = detalhes.avaliacao;
    const nivel = getNivelInfo(av.nivel);
    return (
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => setDetalhes(null)} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backText}>Voltar às análises</Text>
        </TouchableOpacity>

        <Text style={styles.detalheNome}>{av.funcionario_nome}</Text>
        <Text style={styles.detalheData}>{formatarData(av.data_avaliacao)}</Text>

        <View style={[styles.detalheNivelCard, { borderLeftColor: nivel.color }]}>
          <View style={[styles.nivelBadge, { backgroundColor: nivel.bg }]}>
            <Text style={[styles.nivelText, { color: nivel.color }]}>{nivel.label}</Text>
          </View>
          <Text style={styles.detalhePontuacao}>Pontuação: {av.pontuacao_total}</Text>
          <Text style={styles.detalheRec}>{av.recomendacoes}</Text>
        </View>

        <Text style={styles.respostasTitle}>Respostas detalhadas</Text>
        {detalhes.respostas && detalhes.respostas.length > 0 ? (
          detalhes.respostas.map((r: any, i: number) => (
            <View key={i} style={styles.respostaCard}>
              <Text style={styles.respostaPergunta}>{r.pergunta_texto}</Text>
              <View style={styles.respostaRow}>
                <Text style={styles.respostaLabel}>Resposta:</Text>
                <View style={[styles.respostaValorBadge, { backgroundColor: OPCOES_COLORS[r.resposta] + "20" }]}>
                  <Text style={[styles.respostaValorText, { color: OPCOES_COLORS[r.resposta] }]}>
                    {r.resposta_label} ({r.resposta}/5)
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhuma resposta detalhada encontrada.</Text>
        )}

        {/* ── PARECER DO PSICÓLOGO ── */}
        <View style={styles.parecerBox}>
          <View style={styles.parecerHeader}>
            <Ionicons name="medical-outline" size={20} color={colors.primary} />
            <Text style={styles.parecerTitle}>
              {parecerExistente ? "Editar parecer clínico" : "Emitir parecer clínico"}
            </Text>
          </View>
          <Text style={styles.parecerHint}>
            Registre sua análise profissional sobre esta avaliação.
          </Text>

          <Text style={styles.fieldLabel}>Parecer</Text>
          <TextInput
            style={styles.parecerInput}
            placeholder="Descreva sua análise sobre o estado do colaborador..."
            placeholderTextColor="#94A3B8"
            value={parecerTexto}
            onChangeText={setParecerTexto}
            multiline
          />

          <Text style={styles.fieldLabel}>Nível de atenção</Text>
          <View style={styles.atencaoRow}>
            {[
              { key: "rotina", label: "Rotina", color: "#16A34A" },
              { key: "acompanhar", label: "Acompanhar", color: "#D97706" },
              { key: "urgente", label: "Urgente", color: "#DC2626" },
            ].map((n) => (
              <TouchableOpacity
                key={n.key}
                style={[
                  styles.atencaoChip,
                  nivelAtencao === n.key && { backgroundColor: n.color, borderColor: n.color },
                ]}
                onPress={() => setNivelAtencao(n.key)}
              >
                <Text
                  style={[
                    styles.atencaoText,
                    nivelAtencao === n.key && { color: "#fff" },
                  ]}
                >
                  {n.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Encaminhamento (opcional)</Text>
          <TextInput
            style={styles.parecerInputSmall}
            placeholder="Ex.: Agendar sessão / indicar conteúdos / reavaliar em 15 dias"
            placeholderTextColor="#94A3B8"
            value={encaminhamento}
            onChangeText={setEncaminhamento}
            multiline
          />

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setNecessita((v) => !v)}
          >
            <Ionicons
              name={necessita ? "checkbox" : "square-outline"}
              size={22}
              color={necessita ? colors.primary : "#94A3B8"}
            />
            <Text style={styles.switchText}>Necessita acompanhamento contínuo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.salvarParecerBtn, salvandoParecer && { opacity: 0.6 }]}
            onPress={salvarParecer}
            disabled={salvandoParecer}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.salvarParecerText}>
              {salvandoParecer ? "Salvando..." : parecerExistente ? "Atualizar parecer" : "Salvar parecer"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Análises</Text>
      <Text style={styles.subtitle}>
        Avaliações realizadas pelos funcionários com resultados e recomendações.
      </Text>

      <TextInput
        placeholder="Buscar por funcionário ou empresa"
        value={filtro}
        onChangeText={setFiltro}
        style={styles.input}
        placeholderTextColor="#94A3B8"
      />

      <View style={styles.filtersRow}>
        {[
          { key: "todos", label: "Todos" },
          { key: "risco", label: "Risco" },
          { key: "medio", label: "Atenção" },
          { key: "bom", label: "Bom" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, statusFiltro === f.key && styles.filterBtnActive]}
            onPress={() => setStatusFiltro(f.key)}
          >
            <Text style={[styles.filterText, statusFiltro === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {resultados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhuma avaliação encontrada.</Text>
        </View>
      ) : (
        resultados.map((item) => {
          const nivel = getNivelInfo(item.nivel);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNome}>{item.funcionario_nome}</Text>
                  <Text style={styles.cardEmpresa}>{item.empresa_nome}</Text>
                </View>
                <View style={[styles.nivelBadge, { backgroundColor: nivel.bg }]}>
                  <Text style={[styles.nivelText, { color: nivel.color }]}>{nivel.label}</Text>
                </View>
              </View>

              <Text style={styles.cardMeta}>Data: {formatarData(item.data_avaliacao)}</Text>
              <Text style={styles.cardMeta}>Pontuação: {item.pontuacao_total}</Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => abrirDetalhe(item.id)}
                disabled={loadingDetalhe}
              >
                <Text style={styles.actionText}>
                  {loadingDetalhe ? "Carregando..." : "Ver detalhes"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const OPCOES_COLORS: Record<number, string> = {
  1: "#16A34A",
  2: "#65A30D",
  3: "#D97706",
  4: "#EA580C",
  5: "#DC2626",
};

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 50, backgroundColor: "#EEF4F6", flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: colors.primary, marginBottom: 8 },
  subtitle: { color: colors.muted, marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    backgroundColor: "#fff", fontSize: 15,
  },
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  filterBtn: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fff" },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: 17, fontWeight: "700", color: colors.text },
  cardEmpresa: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardMeta: { color: colors.muted, marginBottom: 4, fontSize: 14 },
  nivelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  nivelText: { fontWeight: "700", fontSize: 13 },
  actionButton: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 10 },
  actionText: { color: "#fff", fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: "center" },

  // Detalhes
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  backText: { fontSize: 16, fontWeight: "600", color: colors.primary },
  detalheNome: { fontSize: 24, fontWeight: "800", color: colors.primary, marginBottom: 4 },
  detalheData: { fontSize: 14, color: colors.muted, marginBottom: 16 },
  detalheNivelCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  detalhePontuacao: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 6 },
  detalheRec: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  respostasTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 14 },
  respostaCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  respostaPergunta: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 8, lineHeight: 22 },
  respostaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  respostaLabel: { fontSize: 13, color: colors.muted },
  respostaValorBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  respostaValorText: { fontWeight: "700", fontSize: 13 },

  // Parecer do psicólogo
  parecerBox: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginTop: 20, marginBottom: 30,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  parecerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  parecerTitle: { fontSize: 18, fontWeight: "800", color: colors.primary },
  parecerHint: { fontSize: 13, color: colors.muted, marginBottom: 14 },
  fieldLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 6 },
  parecerInput: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 12,
    minHeight: 90, textAlignVertical: "top", backgroundColor: "#F8FAFC", fontSize: 15, color: colors.text,
  },
  parecerInputSmall: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 12,
    minHeight: 60, textAlignVertical: "top", backgroundColor: "#F8FAFC", fontSize: 14, color: colors.text,
  },
  atencaoRow: { flexDirection: "row", gap: 8 },
  atencaoChip: {
    flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10,
    paddingVertical: 10, alignItems: "center", backgroundColor: "#fff",
  },
  atencaoText: { fontWeight: "700", fontSize: 13, color: colors.text },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 4 },
  switchText: { fontSize: 14, color: colors.text, flex: 1 },
  salvarParecerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, marginTop: 16,
  },
  salvarParecerText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
