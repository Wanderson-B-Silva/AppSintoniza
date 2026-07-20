import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Linking,
} from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

type Questionario = {
  id: number;
  titulo: string;
  descricao: string;
  total_perguntas: number;
};

type DiaSerie = { dia: string; rotulo: string; media: number | null };

type Historico = {
  streak: number;
  media_bem_estar: number;
  humor_predominante: string | null;
  total_dias_registrados: number;
  serie_7dias: DiaSerie[];
};

const MOODS = [
  { icon: "happy-outline" as const, label: "Bem", humor: "bem", nota: 4, color: "#16A34A" },
  { icon: "rocket-outline" as const, label: "Motivado", humor: "motivado", nota: 5, color: "#2563EB" },
  { icon: "sad-outline" as const, label: "Triste", humor: "triste", nota: 2, color: "#D97706" },
  { icon: "thunderstorm-outline" as const, label: "Ansioso", humor: "ansioso", nota: 2, color: "#DC2626" },
  { icon: "moon-outline" as const, label: "Cansado", humor: "cansado", nota: 3, color: "#6366F1" },
];

const NIVEL = {
  bom: { label: "Saudável", color: "#16A34A" },
  medio: { label: "Atenção", color: "#D97706" },
  risco: { label: "Risco", color: "#DC2626" },
} as const;

const PROXIMO_PASSO: Record<string, { titulo: string; texto: string; icon: any }> = {
  bom: {
    titulo: "Continue assim",
    texto: "Seus indicadores estão saudáveis. Mantenha pausas e bons hábitos de sono.",
    icon: "leaf-outline",
  },
  medio: {
    titulo: "Vale um cuidado extra",
    texto: "Reserve momentos de descanso e veja os conteúdos de manejo de estresse.",
    icon: "compass-outline",
  },
  risco: {
    titulo: "Você não está sozinho",
    texto: "Procure apoio. O CVV atende 24h pelo 188, é gratuito e confidencial.",
    icon: "heart-outline",
  },
};

export default function HomeCliente() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState("Funcionário");
  const [questionarios, setQuestionarios] = useState<Questionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<any>(null);
  const [hist, setHist] = useState<Historico | null>(null);

  // modal de check-in com nota opcional
  const [modalMood, setModalMood] = useState<(typeof MOODS)[number] | null>(null);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  // modal de acolhimento / crise
  const [crisisOpen, setCrisisOpen] = useState(false);

  const carregarDados = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const auth = { Authorization: `Token ${token}` };

      const perfilRes = await fetch(API_ROUTES.perfil, { headers: auth });
      if (perfilRes.ok) {
        const p = await perfilRes.json();
        setNome(p.first_name || p.username || "Funcionário");
      }

      const qRes = await fetch(API_ROUTES.listarQuestionarios);
      if (qRes.ok) setQuestionarios(await qRes.json());

      try {
        const avRes = await fetch(API_ROUTES.ultimaAvaliacao, { headers: auth });
        if (avRes.ok) {
          const av = await avRes.json();
          if (av.id) setUltimaAvaliacao(av);
        }
      } catch {}

      try {
        const hRes = await fetch(API_ROUTES.historicoCheckin, { headers: auth });
        if (hRes.ok) setHist(await hRes.json());
      } catch {}
    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDados();
  }, []);

  const confirmarCheckin = async () => {
    if (!modalMood || enviando) return;
    try {
      setEnviando(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_ROUTES.registrarCheckin, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          humor: modalMood.humor,
          nota: modalMood.nota,
          observacao: nota.trim(),
        }),
      });
      if (res.ok) {
        const label = modalMood.label;
        setModalMood(null);
        setNota("");
        await carregarDados();
        appAlert("Check-in registrado", `Você marcou "${label}" hoje. Obrigado por compartilhar!`);
      } else {
        appAlert("Atenção", "Não foi possível registrar agora. Tente novamente.");
      }
    } catch {
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setEnviando(false);
    }
  };

  const iniciarQuestionario = (q: Questionario) => {
    router.push({
      pathname: "/(tabs)/(clientes)/responder-questionario" as any,
      params: { questionario_id: String(q.id), titulo: q.titulo },
    });
  };

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const streak = hist?.streak || 0;
  const media = hist?.media_bem_estar || 0;
  const serie = hist?.serie_7dias || [];
  const passo = ultimaAvaliacao ? PROXIMO_PASSO[ultimaAvaliacao.nivel] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroDate}>{hoje}</Text>
            <Text style={styles.heroHi}>Olá, {nome}!</Text>
            <Text style={styles.heroSub}>Como você está se sentindo hoje?</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={16} color="#F59E0B" />
              <Text style={styles.streakNum}>{streak}</Text>
              <Text style={styles.streakLbl}>dias</Text>
            </View>
          )}
        </View>

        {/* Check-in de humor */}
        <View style={styles.moodRow}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.label}
              style={styles.moodItem}
              onPress={() => {
                setNota("");
                setModalMood(mood);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.moodCircle, { backgroundColor: mood.color + "26" }]}>
                <Ionicons name={mood.icon} size={24} color={mood.color} />
              </View>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Acolhimento / ajuda imediata */}
      <TouchableOpacity style={styles.helpCard} onPress={() => setCrisisOpen(true)} activeOpacity={0.85}>
        <View style={styles.helpIcon}>
          <Ionicons name="heart" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.helpTitle}>Precisa conversar agora?</Text>
          <Text style={styles.helpSub}>Apoio emocional gratuito e sigiloso, 24h</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#B91C1C" />
      </TouchableOpacity>

      {/* Seu bem-estar (streak + tendência 7 dias) */}
      {(hist?.total_dias_registrados || 0) > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>Seu bem-estar</Text>
              <Text style={styles.cardSub}>Últimos 7 dias</Text>
            </View>
            <View style={styles.mediaWrap}>
              <Text style={styles.mediaNum}>{media.toFixed(1)}</Text>
              <Text style={styles.mediaMax}>/5</Text>
            </View>
          </View>

          <View style={styles.trendRow}>
            {serie.map((d, i) => {
              const val = d.media ?? 0;
              const h = d.media == null ? 6 : Math.max(10, (val / 5) * 64);
              const cor = d.media == null ? "#E2E8F0" : val >= 4 ? "#16A34A" : val >= 3 ? "#D97706" : "#DC2626";
              return (
                <View key={i} style={styles.trendCol}>
                  <View style={styles.trendBarTrack}>
                    <View style={[styles.trendBar, { height: h, backgroundColor: cor }]} />
                  </View>
                  <Text style={styles.trendLbl}>{d.rotulo}</Text>
                </View>
              );
            })}
          </View>
          {streak >= 3 && (
            <View style={styles.streakNote}>
              <Ionicons name="flame" size={14} color="#F59E0B" />
              <Text style={styles.streakNoteTxt}>
                {streak} dias seguidos de check-in. Continue cuidando de você!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Última avaliação + próximo passo */}
      {ultimaAvaliacao && (
        <>
          <Text style={styles.sectionTitle}>Última avaliação</Text>
          <View
            style={[
              styles.avaliacaoCard,
              { borderLeftColor: (NIVEL as any)[ultimaAvaliacao.nivel]?.color || colors.muted },
            ]}
          >
            <View style={styles.avaliacaoHeader}>
              <Text
                style={[
                  styles.nivelBadge,
                  {
                    backgroundColor: ((NIVEL as any)[ultimaAvaliacao.nivel]?.color || colors.muted) + "20",
                    color: (NIVEL as any)[ultimaAvaliacao.nivel]?.color || colors.muted,
                  },
                ]}
              >
                {(NIVEL as any)[ultimaAvaliacao.nivel]?.label || ultimaAvaliacao.nivel}
              </Text>
              <Text style={styles.avaliacaoData}>
                {ultimaAvaliacao.dias_desde_ultima === 0
                  ? "Hoje"
                  : `Há ${ultimaAvaliacao.dias_desde_ultima} dias`}
              </Text>
            </View>
            {passo && (
              <View style={styles.passoBox}>
                <Ionicons name={passo.icon} size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.passoTitulo}>{passo.titulo}</Text>
                  <Text style={styles.passoTexto}>{passo.texto}</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {/* Questionários */}
      <Text style={styles.sectionTitle}>Questionários disponíveis</Text>
      {questionarios.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhum questionário disponível no momento.</Text>
        </View>
      ) : (
        questionarios.map((q) => (
          <TouchableOpacity key={q.id} style={styles.questionarioCard} onPress={() => iniciarQuestionario(q)}>
            <View style={styles.qIconWrap}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qTitle}>{q.titulo}</Text>
              <Text style={styles.qDesc} numberOfLines={1}>{q.descricao || "Toque para responder"}</Text>
              <Text style={styles.qMeta}>{q.total_perguntas} perguntas</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionTitle}>Dica do dia</Text>
      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={28} color="#D97706" />
        <Text style={styles.tipText}>
          Reserve 10 minutos do seu dia para respiração consciente. Isso ajuda a reduzir a
          ansiedade e melhorar o foco.
        </Text>
      </View>

      <View style={{ height: 24 }} />

      {/* Modal de acolhimento / crise */}
      <Modal visible={crisisOpen} transparent animationType="fade" onRequestClose={() => setCrisisOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalMoodCircle, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="heart" size={30} color="#B91C1C" />
            </View>
            <Text style={styles.modalTitle}>Você não está sozinho</Text>
            <Text style={styles.modalSub}>
              Se você está passando por um momento difícil, procure apoio. É gratuito,
              sigiloso e disponível a qualquer hora.
            </Text>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#B91C1C" }]}
              onPress={() => Linking.openURL("tel:188")}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.modalBtnTxt}>Ligar para o CVV — 188</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
              onPress={() => Linking.openURL("https://www.cvv.org.br/")}
            >
              <Ionicons name="chatbubbles" size={18} color="#fff" />
              <Text style={styles.modalBtnTxt}>Chat e e-mail do CVV</Text>
            </TouchableOpacity>

            <Text style={styles.crisisEmergency}>
              Em emergência médica, ligue 192 (SAMU). Risco imediato à vida: 190.
            </Text>

            <TouchableOpacity onPress={() => setCrisisOpen(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de check-in com nota opcional */}
      <Modal visible={!!modalMood} transparent animationType="fade" onRequestClose={() => setModalMood(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {modalMood && (
              <>
                <View style={[styles.modalMoodCircle, { backgroundColor: modalMood.color + "26" }]}>
                  <Ionicons name={modalMood.icon} size={30} color={modalMood.color} />
                </View>
                <Text style={styles.modalTitle}>Você está se sentindo {modalMood.label.toLowerCase()}</Text>
                <Text style={styles.modalSub}>Quer contar algo sobre o seu dia? (opcional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex.: muita demanda hoje, dormi mal..."
                  placeholderTextColor="#94A3B8"
                  value={nota}
                  onChangeText={setNota}
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: modalMood.color }]}
                  onPress={confirmarCheckin}
                  disabled={enviando}
                >
                  {enviando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.modalBtnTxt}>Registrar check-in</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalMood(null)} style={styles.modalCancel}>
                  <Text style={styles.modalCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF4F6" },
  content: { padding: 18, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#EEF4F6" },

  // Hero
  hero: {
    backgroundColor: colors.primary, borderRadius: 24, padding: 20, overflow: "hidden",
    marginBottom: 16,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  heroGlow: {
    position: "absolute", top: -40, right: -30, width: 150, height: 150, borderRadius: 75,
    backgroundColor: "rgba(95,191,140,0.25)",
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroDate: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  heroHi: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 2 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 2 },
  streakPill: {
    alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  streakNum: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 2 },
  streakLbl: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700" },

  moodRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  moodItem: { alignItems: "center", gap: 6, flex: 1 },
  moodCircle: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  moodLabel: { fontSize: 11, color: "#fff", fontWeight: "600" },

  // Acolhimento / ajuda
  helpCard: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FEF2F2",
    borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#FECACA",
  },
  helpIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  helpTitle: { fontSize: 15, fontWeight: "800", color: "#B91C1C" },
  helpSub: { fontSize: 12, color: "#9B2C2C", marginTop: 2 },
  crisisEmergency: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 16, lineHeight: 17 },

  // Card genérico
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 16,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  mediaWrap: { flexDirection: "row", alignItems: "baseline" },
  mediaNum: { fontSize: 26, fontWeight: "800", color: colors.primary },
  mediaMax: { fontSize: 13, color: colors.muted, fontWeight: "700" },

  trendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 88 },
  trendCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 },
  trendBarTrack: { height: 64, justifyContent: "flex-end" },
  trendBar: { width: 18, borderRadius: 6 },
  trendLbl: { fontSize: 10, color: colors.muted, fontWeight: "700" },
  streakNote: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14,
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 10,
  },
  streakNoteTxt: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600" },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12, marginTop: 4 },

  avaliacaoCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderLeftWidth: 5,
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avaliacaoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  nivelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, fontWeight: "800", fontSize: 13, overflow: "hidden" },
  avaliacaoData: { fontSize: 13, color: colors.muted },
  passoBox: { flexDirection: "row", gap: 12, backgroundColor: "#EEF1FF", borderRadius: 12, padding: 12 },
  passoTitulo: { fontSize: 14, fontWeight: "800", color: colors.primary, marginBottom: 2 },
  passoTexto: { fontSize: 13, color: "#475569", lineHeight: 19 },

  questionarioCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 12,
    shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  qIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginRight: 14 },
  qTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 2 },
  qDesc: { fontSize: 13, color: colors.muted },
  qMeta: { fontSize: 12, color: colors.primary, fontWeight: "700", marginTop: 4 },

  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 30, alignItems: "center", marginBottom: 24, gap: 10 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },
  tipCard: {
    backgroundColor: "#FFFBEB", borderRadius: 16, padding: 18, flexDirection: "row",
    alignItems: "flex-start", gap: 14, borderWidth: 1, borderColor: "#FDE68A",
  },
  tipText: { flex: 1, fontSize: 14, color: "#92400E", lineHeight: 22 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center" },
  modalMoodCircle: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center" },
  modalSub: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6, marginBottom: 16 },
  modalInput: {
    alignSelf: "stretch", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14,
    padding: 14, fontSize: 14, color: colors.text, minHeight: 70, textAlignVertical: "top", marginBottom: 16,
  },
  modalBtn: {
    alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  modalBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  modalCancel: { marginTop: 12, paddingVertical: 6 },
  modalCancelTxt: { color: colors.muted, fontWeight: "700", fontSize: 14 },
});
