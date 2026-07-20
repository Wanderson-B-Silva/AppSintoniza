import { View, StyleSheet, Alert } from "react-native";
import { appAlert } from "../../services/feedback";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AuthHeader } from "../../components/AuthHeader";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BackButton } from "../../components/botao_voltar";

export default function VerifyCode() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [codigo, setCodigo] = useState("");

  const continuar = () => {
    if (!codigo) {
      appAlert("Erro", "Digite o código");
      return;
    }

    router.push({
      pathname: "/nova_senha",
      params: {
        email,
        codigo,
      },
    });
  };

  return (
    <View style={styles.container}>
      <BackButton  />

      <AuthHeader
        title="Verificação"
        subtitle="Digite o código enviado"
      />

      <TextField
        label="Código"
        value={codigo}
        onChangeText={setCodigo}
      />

      <PrimaryButton
        title="Continuar"
        onPress={continuar}
      />
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
