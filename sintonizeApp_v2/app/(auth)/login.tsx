import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { colors } from "../../theme/colors";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AnimatedBackground } from "../../components/AnimatedBackground";
import { useFeedback } from "../../components/Feedback";
import { API_ROUTES } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Login() {
  const { toast } = useFeedback();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const fazerLogin = async () => {
    Keyboard.dismiss();
    if (!username.trim() || !password.trim()) {
      toast("Preencha usuário e senha", "warning");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_ROUTES.loginToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { erro: raw || "Resposta inválida do servidor" };
      }

      if (!response.ok) {
        toast(data.erro || "Falha no login", "error");
        return;
      }
      if (!data.token) {
        toast("Token não retornado pelo servidor.", "error");
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("tipo", data.tipo || "");
      await AsyncStorage.setItem("user_id", String(data.user_id || ""));
      if (data.empresa_id) {
        await AsyncStorage.setItem("empresa_id", String(data.empresa_id));
      }

      if (data.tipo === "funcionario") {
        router.replace("/(tabs)/(clientes)/tela_inicial");
        return;
      }
      if (data.tipo === "empresa") {
        router.replace("/(tabs)/(empresa)/tela_inicial");
        return;
      }
      if (data.tipo === "psicologo") {
        router.replace("/(tabs)/(psicologo)/tela_inicial");
        return;
      }

      toast("Tipo de usuário inválido", "error");
    } catch (error) {
      toast("Não foi possível conectar ao servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topArea}>
              <View style={styles.logoWrap}>
                <Image source={require("../../assets/images/logo.png")} style={styles.logo} />
              </View>
              <Text style={styles.title}>Bem-vindo</Text>
              <Text style={styles.subtitle}>
                Entre para continuar sua jornada de cuidado e bem-estar.
              </Text>
            </View>

            <View style={styles.card}>
              <TextField
                label="Usuário"
                placeholder="Digite seu username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                icon="person-outline"
                returnKeyType="next"
              />

              <TextField
                label="Senha"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                icon="lock-closed-outline"
                returnKeyType="done"
                onSubmitEditing={fazerLogin}
              />

              <TouchableOpacity
                style={styles.forgotWrap}
                onPress={() => router.push("/(auth)/esqueci_senha")}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              <PrimaryButton
                title="Entrar"
                onPress={fazerLogin}
                loading={loading}
                style={styles.button}
              />

              <TouchableOpacity
                onPress={() => router.push("/(auth)/register")}
                style={styles.registerWrap}
              >
                <Text style={styles.registerText}>
                  Não tem uma conta? <Text style={styles.registerLink}>Registre-se</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 40,
  },
  topArea: { alignItems: "center", marginBottom: 22 },
  logoWrap: {
    width: 150,
    height: 150,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 18,
  },
  logo: { width: 120, height: 120, resizeMode: "contain" },
  title: { fontSize: 32, fontWeight: "900", color: colors.primary, marginBottom: 8 },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#60738C",
    textAlign: "center",
    paddingHorizontal: 10,
    maxWidth: 320,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: "#10213A",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  forgotWrap: { alignSelf: "flex-end", marginTop: 2, marginBottom: 16 },
  forgotText: { color: "#6A88A2", fontSize: 13, fontWeight: "600" },
  button: { marginTop: 4 },
  registerWrap: { marginTop: 18, alignItems: "center" },
  registerText: { color: "#6B7280", fontSize: 14 },
  registerLink: { color: "#2563EB", fontWeight: "700" },
});
