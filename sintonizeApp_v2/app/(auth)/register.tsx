import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { colors } from "../../theme/colors";
import { BackButton } from "../../components/botao_voltar";

export default function RegisterChoice() {
  return (
    <View style={styles.container}>
      <BackButton href="/(auth)/login" />

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>
          Escolha como deseja utilizar o Sintoniza
        </Text>
      </View>

      <View style={styles.cardsArea}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/(auth)/register-cli")}
        >
          <Text style={styles.cardTitle}>Usuário</Text>
          <Text style={styles.cardDesc}>
            Acesse questionários, conteúdos e acompanhe sua saúde mental
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/(auth)/register-psi")}
        >
          <Text style={styles.cardTitle}>Psicólogo</Text>
          <Text style={styles.cardDesc}>
            Analise pacientes, crie questionários e acompanhe resultados
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/(auth)/register-emp")}
        >
          <Text style={styles.cardTitle}>Empresa</Text>
          <Text style={styles.cardDesc}>
            Gerencie colaboradores e acompanhe indicadores
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4F6",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: "contain",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7A90",
    textAlign: "center",
    maxWidth: 280,
  },
  cardsArea: {
    gap: 18,
  },
  card: {
    backgroundColor: "white",
    padding: 22,
    borderRadius: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
});