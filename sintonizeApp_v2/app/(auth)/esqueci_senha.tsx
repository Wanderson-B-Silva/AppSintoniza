import { View, StyleSheet, Alert } from "react-native";
import { appAlert } from "../../services/feedback";
import { useState } from "react";
import { router } from "expo-router";
import { AuthHeader } from "../../components/AuthHeader";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BackButton } from "../../components/botao_voltar";
import { API_ROUTES } from "../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const solicitarCodigo = async () => {
    if (!email) {
      appAlert("Erro", "Digite seu email");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      appAlert("Erro", "Digite um email válido");
      return;
    }

    try {
      const response = await fetch(API_ROUTES.resetSolicitar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        appAlert("Erro", "Resposta inválida do servidor");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        appAlert("Erro", data.erro || "Erro ao solicitar código");
        return;
      }

      appAlert("Sucesso", "Código enviado para o email.");
      router.push({
        pathname: "/(auth)/verification_cod",
        params: { email },
      });
    } catch (error) {
      console.log(error);
      appAlert("Erro", "Erro ao conectar com servidor");
    }
  };

  return (
    <View style={styles.container}>
      <BackButton href="/(auth)/login" />
      <AuthHeader title="Esqueci minha senha" subtitle="Digite seu email para receber o código" />
      <TextField label="Email" value={email} onChangeText={setEmail} />
      <PrimaryButton title="Enviar código" onPress={solicitarCodigo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    justifyContent: "center",
    backgroundColor: "#EEF4F6",
  },
});
