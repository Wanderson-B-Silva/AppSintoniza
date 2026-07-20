import { View, Text, StyleSheet, ImageBackground } from "react-native";
import { router } from "expo-router";
import { colors } from "../theme/colors";
import { PrimaryButton } from "../components/PrimaryButton";

export default function Welcome() {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/images/tela_inicial.png")}
        style={styles.heroBackground}
        imageStyle={styles.heroImage}
      >
        <View style={styles.topGlow} />
        <View style={styles.rightCircle} />
        <View style={styles.leftCircle} />
      </ImageBackground>

      <View style={styles.contentCard}>
        <Text style={styles.kicker}>Sintoniza</Text>

        <Text style={styles.title}>
          Vamos começar{"\n"}nossa jornada
        </Text>

        <Text style={styles.subtitle}>
          Bem-vindo ao nosso espaço de saúde mental, onde iremos juntos cuidar
          da sua mente com acolhimento, equilíbrio e acompanhamento.
        </Text>

        <PrimaryButton
          title="Começar"
          variant="mint"
          onPress={() => router.push("/(auth)/login")}
          style={styles.button}
        />
      </View>

      <View style={styles.progress}>
        <Text style={styles.number}>01</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressBar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4F6",
  },

  heroBackground: {
    flex: 1.15,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  heroImage: {
    resizeMode: "cover",
    opacity: 0.24,
    transform: [{ scale: 1.15 }],
  },

  topGlow: {
    position: "absolute",
    top: 30,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  rightCircle: {
    position: "absolute",
    right: -40,
    top: 100,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(154, 217, 180, 0.18)",
  },

  leftCircle: {
    position: "absolute",
    left: -30,
    bottom: 40,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(30, 42, 120, 0.08)",
  },

  contentCard: {
    flex: 0.9,
    marginTop: -36,
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 30,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 34,
    shadowColor: "#10213A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    justifyContent: "center",
  },

  kicker: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "#6A88A2",
    textAlign: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.primary,
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 16,
  },

  subtitle: {
    fontSize: 16,
    color: "#5F7391",
    textAlign: "center",
    lineHeight: 25,
    paddingHorizontal: 4,
  },

  button: {
    marginTop: 28,
    minWidth: 220,
    alignSelf: "center",
    borderRadius: 16,
  },

  progress: {
    position: "absolute",
    left: 22,
    bottom: 34,
    alignItems: "center",
  },

  number: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 8,
  },

  progressTrack: {
    width: 4,
    height: 54,
    borderRadius: 4,
    backgroundColor: "rgba(30,42,120,0.15)",
    overflow: "hidden",
  },

  progressBar: {
    width: 4,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});