import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../../theme/colors";
import { radius, font, shadow } from "../../../theme/tokens";
import { ScreenBg } from "../../../components/ScreenBg";

const CONTEUDOS = {
  dicas: [
    { id: 1, titulo: "Pratique a Gratidao", texto: "Reserve 5 minutos ao final do dia para anotar 3 coisas pelas quais e grato. Estudos mostram reducao de cortisol.", icon: "heart", cor: "#E11D48", bg: "#FFE4E6" },
    { id: 2, titulo: "Tecnica 4-7-8", texto: "Inspire por 4s, segure por 7s, expire por 8s. Repita 4 vezes. Ideal para reduzir ansiedade rapidamente.", icon: "leaf", cor: "#059669", bg: "#D1FAE5" },
    { id: 3, titulo: "Pausas Ativas", texto: "A cada 90 min de trabalho, faca uma pausa de 10 min com alongamento leve. Seu cerebro agradece.", icon: "walk", cor: "#7C3AED", bg: "#EDE9FE" },
  ],
  livros: [
    { id: 1, nome: "Inteligencia Emocional", autor: "Daniel Goleman", desc: "Como as emocoes impactam decisoes e relacionamentos no trabalho.", busca: "Inteligencia Emocional Daniel Goleman livro" },
    { id: 2, nome: "Ansiedade", autor: "Augusto Cury", desc: "Tecnicas praticas para controlar a ansiedade no dia a dia.", busca: "Ansiedade Augusto Cury livro" },
    { id: 3, nome: "O Poder do Habito", autor: "Charles Duhigg", desc: "Como criar habitos saudaveis que melhoram a saude mental.", busca: "O Poder do Habito Charles Duhigg livro" },
  ],
  videos: [
    { id: 1, nome: "Como Lidar com o Estresse no Trabalho", origem: "YouTube", desc: "Dicas de psicologos para gerenciar o estresse ocupacional.", busca: "como lidar com estresse no trabalho" },
    { id: 2, nome: "Rotina Saudavel e Mente Equilibrada", origem: "Sintonize", desc: "Guia para construir uma rotina que protege sua saude mental.", busca: "rotina saudavel mente equilibrada" },
    { id: 3, nome: "Tecnicas de Respiracao para Ansiedade", origem: "YouTube", desc: "Exercicios de respiracao guiados para momentos de crise.", busca: "tecnicas de respiracao para ansiedade" },
  ],
};

type Filtro = "tudo" | "dicas" | "livros" | "videos";

const FILTROS: { key: Filtro; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "tudo", label: "Tudo", icon: "apps" },
  { key: "dicas", label: "Dicas", icon: "bulb" },
  { key: "livros", label: "Livros", icon: "book" },
  { key: "videos", label: "Videos", icon: "play-circle" },
];

export default function Conteudos() {
  const insets = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<Filtro>("tudo");

  const abrirYoutube = (q: string) =>
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
  const abrirGoogle = (q: string) =>
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(q)}`);

  const showDicas = filtro === "tudo" || filtro === "dicas";
  const showLivros = filtro === "tudo" || filtro === "livros";
  const showVideos = filtro === "tudo" || filtro === "videos";

  return (
    <ScreenBg>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={styles.kicker}>BIBLIOTECA DE BEM-ESTAR</Text>
        <Text style={styles.title}>Conteudos</Text>
        <Text style={styles.subtitle}>
          Recursos selecionados para cuidar da sua saude mental.
        </Text>

        {/* Card destaque */}
        <View style={styles.feature}>
          <View style={styles.featureGlow} />
          <View style={styles.featureBadge}>
            <Ionicons name="sparkles" size={13} color="#fff" />
            <Text style={styles.featureBadgeText}>Destaque</Text>
          </View>
          <Text style={styles.featureTitle}>Respire fundo por 1 minuto</Text>
          <Text style={styles.featureDesc}>
            Uma pausa curta de respiracao reduz a tensao e melhora o foco. Experimente agora.
          </Text>
          <TouchableOpacity
            style={styles.featureBtn}
            activeOpacity={0.85}
            onPress={() => abrirYoutube("exercicio de respiracao guiada 1 minuto")}
          >
            <Ionicons name="play" size={15} color={colors.primary} />
            <Text style={styles.featureBtnText}>Comecar exercicio</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          {FILTROS.map((f) => {
            const active = filtro === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFiltro(f.key)}
                activeOpacity={0.85}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons name={f.icon} size={15} color={active ? "#fff" : colors.primary} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dicas */}
        {showDicas && (
          <>
            <SectionTitle icon="bulb-outline" color="#D97706" title="Dicas de Bem-estar" />
            {CONTEUDOS.dicas.map((d) => (
              <View key={d.id} style={styles.tipCard}>
                <View style={[styles.tipIcon, { backgroundColor: d.bg }]}>
                  <Ionicons name={d.icon as any} size={22} color={d.cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>{d.titulo}</Text>
                  <Text style={styles.tipText}>{d.texto}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Livros */}
        {showLivros && (
          <>
            <SectionTitle icon="book-outline" color={colors.primary} title="Livros Recomendados" />
            {CONTEUDOS.livros.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={styles.row}
                activeOpacity={0.85}
                onPress={() => abrirGoogle(l.busca)}
              >
                <View style={[styles.rowIcon, { backgroundColor: "#EEF2FF" }]}>
                  <Ionicons name="book" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{l.nome}</Text>
                  <Text style={styles.rowMeta}>{l.autor}</Text>
                  <Text style={styles.rowDesc}>{l.desc}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.subtle} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Videos */}
        {showVideos && (
          <>
            <SectionTitle icon="videocam-outline" color="#DC2626" title="Videos Educativos" />
            {CONTEUDOS.videos.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.row}
                activeOpacity={0.85}
                onPress={() => abrirYoutube(v.busca)}
              >
                <View style={[styles.rowIcon, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="play" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{v.nome}</Text>
                  <Text style={styles.rowMeta}>Fonte: {v.origem}</Text>
                  <Text style={styles.rowDesc}>{v.desc}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.subtle} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Helpline */}
        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <Ionicons name="call" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Precisa de ajuda agora?</Text>
            <Text style={styles.helpText}>CVV - Centro de Valorizacao da Vida</Text>
          </View>
          <TouchableOpacity style={styles.helpBtn} onPress={() => Linking.openURL("tel:188")}>
            <Text style={styles.helpBtnText}>188</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenBg>
  );
}

function SectionTitle({
  icon,
  color,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const card = {
  backgroundColor: "rgba(255,255,255,0.96)",
  borderRadius: radius.xl,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.line,
} as const;

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 130 },

  kicker: { fontSize: 11, fontWeight: "800", color: colors.mintDark, letterSpacing: 1.5 },
  title: { fontSize: 30, fontWeight: "900", color: colors.primary, marginTop: 2 },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 14, marginBottom: 18, lineHeight: 20 },

  feature: {
    backgroundColor: colors.primary,
    borderRadius: radius["2xl"],
    padding: 22,
    overflow: "hidden",
    marginBottom: 18,
    ...shadow.primary,
  },
  featureGlow: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.mint,
    opacity: 0.25,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 12,
  },
  featureBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  featureTitle: { color: "#fff", fontSize: 21, fontWeight: "900", marginBottom: 6 },
  featureDesc: { color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 21, marginBottom: 16 },
  featureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  featureBtnText: { color: colors.primary, fontWeight: "800", fontSize: 14 },

  filterRow: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 20, flexGrow: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 4 },
  sectionDot: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  tipCard: { ...card, flexDirection: "row", gap: 14, padding: 16, marginBottom: 12, ...shadow.sm },
  tipIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tipTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 3 },
  tipText: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  row: { ...card, flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 12, ...shadow.sm },
  rowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  rowMeta: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 2 },
  rowDesc: { fontSize: 12.5, color: colors.muted, marginTop: 4, lineHeight: 18 },

  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#064E3B",
    borderRadius: radius.xl,
    padding: 16,
    marginTop: 10,
    ...shadow.md,
  },
  helpIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  helpTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  helpText: { color: "rgba(255,255,255,0.8)", fontSize: 12.5, marginTop: 2 },
  helpBtn: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  helpBtnText: { color: "#064E3B", fontWeight: "900", fontSize: 16 },
});
