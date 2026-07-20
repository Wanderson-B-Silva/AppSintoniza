import { ScrollView, StyleSheet, Alert, View, Text, TouchableOpacity } from "react-native";
import { appAlert } from "../../services/feedback";
import { useState } from "react";
import { router } from "expo-router";
import { AuthHeader } from "../../components/AuthHeader";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BackButton } from "../../components/botao_voltar";
import { API_ROUTES } from "../../services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";

const ESPECIALIDADES = [
  "Psicologia Organizacional",
  "Psicologia Clínica",
  "Neuropsicologia",
  "Psicologia do Trabalho",
  "Psicologia Social",
  "Psicologia da Saúde",
  "Outra",
];

export default function RegisterPsicologo() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Dados pessoais
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Step 2 - Dados profissionais
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [crp, setCrp] = useState("");
  const [empresaId, setEmpresaId] = useState("");

  // Step 3 - Especialidade
  const [especialidade, setEspecialidade] = useState("");

  const validarStep1 = () => {
    if (!firstName.trim()) { appAlert("Atenção", "Informe seu nome."); return false; }
    if (!email.trim()) { appAlert("Atenção", "Informe seu email."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { appAlert("Atenção", "Email inválido."); return false; }
    return true;
  };

  const validarStep2 = () => {
    if (!username.trim()) { appAlert("Atenção", "Informe um nome de usuário."); return false; }
    if (!crp.trim()) { appAlert("Atenção", "Informe seu CRP."); return false; }
    if (!empresaId.trim()) { appAlert("Atenção", "Informe o ID da empresa que você vai atender."); return false; }
    if (!/^\d+$/.test(empresaId.trim())) { appAlert("Atenção", "O ID da empresa deve conter apenas números."); return false; }
    if (!password.trim()) { appAlert("Atenção", "Informe uma senha."); return false; }
    if (password.length < 6) { appAlert("Atenção", "A senha deve ter pelo menos 6 caracteres."); return false; }
    if (password !== confirmPassword) { appAlert("Atenção", "As senhas não coincidem."); return false; }
    return true;
  };

  const avancar = () => {
    if (step === 1 && validarStep1()) setStep(2);
    else if (step === 2 && validarStep2()) setStep(3);
  };

  const handleRegister = async () => {
    if (!especialidade.trim()) {
      appAlert("Atenção", "Selecione sua especialidade.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_ROUTES.cadastroPsicologo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          crp,
          empresa_id: empresaId.trim(),
          first_name: firstName,
          last_name: lastName,
          telefone,
          especialidade,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        appAlert("Erro", "Resposta inválida do servidor");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        appAlert("Erro", data.erro || "Não foi possível cadastrar o psicólogo.");
        return;
      }

      appAlert("Sucesso", "Psicólogo cadastrado com sucesso! Faça login para acessar o sistema.");
      router.replace("/(auth)/login");
    } catch (error) {
      appAlert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepCircle, s <= step && styles.stepCircleActive, s < step && styles.stepCircleDone]}>
            {s < step ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : (
              <Text style={[styles.stepNum, s <= step && styles.stepNumActive]}>{s}</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, s <= step && styles.stepLabelActive]}>
            {s === 1 ? "Pessoal" : s === 2 ? "Acesso" : "Especialidade"}
          </Text>
          {s < 3 && <View style={[styles.stepLine, s < step && styles.stepLineDone]} />}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton href="/(auth)/register" />

      <AuthHeader
        title="Cadastro Psicólogo"
        subtitle="Complete os dados para acessar o sistema profissional"
      />

      <StepIndicator />

      {step === 1 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          </View>

          <TextField label="Nome *" value={firstName} onChangeText={setFirstName} placeholder="Seu nome" />
          <TextField label="Sobrenome" value={lastName} onChangeText={setLastName} placeholder="Seu sobrenome" />
          <TextField label="Email *" value={email} onChangeText={setEmail} placeholder="exemplo@email.com" keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Telefone" value={telefone} onChangeText={setTelefone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />

          <PrimaryButton title="Próximo →" onPress={avancar} style={styles.nextBtn} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Dados de Acesso</Text>
          </View>

          <TextField label="Usuário (login) *" value={username} onChangeText={setUsername} placeholder="seu.usuario" autoCapitalize="none" />
          <TextField label="CRP *" value={crp} onChangeText={setCrp} placeholder="XX/XXXXX" />
          <TextField label="ID da empresa *" value={empresaId} onChangeText={setEmpresaId} placeholder="Ex.: 1" keyboardType="number-pad" />
          <Text style={styles.fieldHint}>
            Informe o ID da empresa que você vai atender. Você terá acesso apenas aos dados dessa empresa.
          </Text>
          <TextField label="Senha *" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />
          <TextField label="Confirmar Senha *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repita a senha" secureTextEntry />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>Voltar</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Próximo →" onPress={avancar} />
            </View>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Especialidade</Text>
          </View>
          <Text style={styles.selectHint}>Selecione sua área de atuação principal:</Text>

          {ESPECIALIDADES.map((esp) => (
            <TouchableOpacity
              key={esp}
              style={[styles.optionCard, especialidade === esp && styles.optionCardActive]}
              onPress={() => setEspecialidade(esp)}
            >
              <View style={[styles.optionRadio, especialidade === esp && styles.optionRadioActive]}>
                {especialidade === esp && <View style={styles.optionRadioDot} />}
              </View>
              <Text style={[styles.optionText, especialidade === esp && styles.optionTextActive]}>{esp}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>Voltar</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={loading ? "Cadastrando..." : "Finalizar Cadastro ✓"}
                onPress={handleRegister}
              />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, backgroundColor: "#EEF4F6", flexGrow: 1 },

  // Steps
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 28, gap: 0 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "#CBD5E1",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  stepCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepCircleDone: { backgroundColor: "#059669", borderColor: "#059669" },
  stepNum: { fontSize: 13, fontWeight: "700", color: "#CBD5E1" },
  stepNumActive: { color: "#fff" },
  stepLabel: { fontSize: 11, fontWeight: "600", color: "#94A3B8", marginLeft: 6, marginRight: 6 },
  stepLabelActive: { color: colors.primary },
  stepLine: { width: 20, height: 2, backgroundColor: "#CBD5E1" },
  stepLineDone: { backgroundColor: "#059669" },

  // Content
  stepContent: { marginTop: 4 },
  fieldHint: { fontSize: 12, color: colors.muted, marginTop: -6, marginBottom: 12, lineHeight: 17 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.primary },

  // Buttons
  nextBtn: { marginTop: 8 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#EEF2FF", borderRadius: 14, borderWidth: 1, borderColor: "#C7D2FE",
  },
  backBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },

  // Speciality selector
  selectHint: { fontSize: 14, color: colors.muted, marginBottom: 14 },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 2, borderColor: "#E2E8F0",
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: "#EEF2FF" },
  optionRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#CBD5E1",
    alignItems: "center", justifyContent: "center",
  },
  optionRadioActive: { borderColor: colors.primary },
  optionRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  optionText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  optionTextActive: { color: colors.primary, fontWeight: "700" },
});
