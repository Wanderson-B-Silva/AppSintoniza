import { View, StyleSheet, Alert } from "react-native";
import { appAlert } from "../../services/feedback";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AuthHeader } from "../../components/AuthHeader";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BackButton } from "../../components/botao_voltar";
import { API_ROUTES } from "../../services/api";

export default function NewPassword() {
  const { email, codigo } = useLocalSearchParams<{ email?: string; codigo?: string }>();
  const [novaSenha, setNovaSenha] = useState("");

  const redefinirSenha = async () => {
    if (!novaSenha) {
      appAlert("Erro", "Digite a nova senha");
      return;
    }

    if (novaSenha.length < 6) {
      appAlert("Erro", "A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      const response = await fetch(API_ROUTES.resetConfirmar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo, nova_senha: novaSenha }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        appAlert("Erro", "Resposta inválida do servidor");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        appAlert("Erro", data.erro || "Erro ao redefinir senha");
        return;
      }

      appAlert("Sucesso", "Senha redefinida!");
      router.replace("/(auth)/login");
    } catch (error) {
      console.log(error);
      appAlert("Erro", "Erro ao conectar servidor");
    }
  };

  return (
    <View style={styles.container}>
      <BackButton href="/(auth)/verification_cod" />
      <AuthHeader title="Nova senha" subtitle="Digite sua nova senha" />
      <TextField label="Nova senha" secureTextEntry value={novaSenha} onChangeText={setNovaSenha} />
      <PrimaryButton title="Redefinir senha" onPress={redefinirSenha} />
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
