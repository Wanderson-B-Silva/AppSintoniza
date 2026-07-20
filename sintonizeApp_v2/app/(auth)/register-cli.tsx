import { ScrollView, StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useFeedback } from "../../components/Feedback";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthHeader } from "../../components/AuthHeader";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BackButton } from "../../components/botao_voltar";
import { API_ROUTES } from "../../services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";

export default function RegisterFuncionario() {
  const { toast } = useFeedback();
  // Origem da navegação: quando a EMPRESA cadastra um funcionário,
  // chamamos esta tela com ?origin=empresa para ajustar voltar/sucesso.
  const { origin } = useLocalSearchParams<{ origin?: string }>();
  const fromEmpresa = origin === "empresa";
  const backHref = fromEmpresa ? "/(tabs)/(empresa)/tela_inicial" : "/(auth)/register";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Dados pessoais
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  // Step 2 - Dados de acesso
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 3 - Dados da empresa
  const [empresaId, setEmpresaId] = useState("");
  const [cargo, setCargo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [matricula, setMatricula] = useState("");

  // Step 4 - Endereço
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const [aceitouLgpd, setAceitouLgpd] = useState(false);

  // Pré-preenche o ID da empresa quando a própria empresa está cadastrando.
  useEffect(() => {
    if (!fromEmpresa) return;
    (async () => {
      const id = await AsyncStorage.getItem("empresa_id");
      if (id) setEmpresaId(id);
    })();
  }, [fromEmpresa]);

  const apenasNumeros = (valor: string) => valor.replace(/\D/g, "");

  const formatarCPF = (valor: string) => {
    const v = apenasNumeros(valor).slice(0, 11);
    return v
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  };

  const formatarCEP = (valor: string) => {
    const v = apenasNumeros(valor).slice(0, 8);
    return v.replace(/^(\d{5})(\d)/, "$1-$2");
  };

  const validarCPF = (valor: string) => {
    const cpfLimpo = apenasNumeros(valor);
    if (cpfLimpo.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpfLimpo[i]) * (10 - i);
    let digito1 = (soma * 10) % 11;
    if (digito1 === 10) digito1 = 0;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpfLimpo[i]) * (11 - i);
    let digito2 = (soma * 10) % 11;
    if (digito2 === 10) digito2 = 0;
    return digito1 === Number(cpfLimpo[9]) && digito2 === Number(cpfLimpo[10]);
  };

  const validarStep1 = () => {
    if (!firstName.trim()) { toast("Informe seu nome.", "warning"); return false; }
    if (!email.trim()) { toast("Informe seu email.", "warning"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Email inválido.", "warning"); return false; }
    if (!cpf.trim()) { toast("Informe seu CPF.", "warning"); return false; }
    if (!validarCPF(cpf)) { toast("CPF inválido.", "warning"); return false; }
    return true;
  };

  const validarStep2 = () => {
    if (!username.trim()) { toast("Informe um nome de usuário.", "warning"); return false; }
    if (!password.trim()) { toast("Informe uma senha.", "warning"); return false; }
    if (password.length < 6) { toast("A senha deve ter pelo menos 6 caracteres.", "warning"); return false; }
    if (password !== confirmPassword) { toast("As senhas não coincidem.", "warning"); return false; }
    return true;
  };

  const validarStep3 = () => {
    if (!empresaId.trim()) { toast("Informe o ID da empresa.", "warning"); return false; }
    if (!cargo.trim()) { toast("Informe seu cargo.", "warning"); return false; }
    return true;
  };

  const avancar = () => {
    if (step === 1 && validarStep1()) setStep(2);
    else if (step === 2 && validarStep2()) setStep(3);
    else if (step === 3 && validarStep3()) setStep(4);
  };

  const handleRegister = async () => {
    if (!cep.trim() || apenasNumeros(cep).length !== 8) {
      toast("Informe um CEP válido.", "warning");
      return;
    }
    if (!endereco.trim()) { toast("Informe o endereço.", "warning"); return; }
    if (!numero.trim()) { toast("Informe o número.", "warning"); return; }
    if (!bairro.trim()) { toast("Informe o bairro.", "warning"); return; }
    if (!cidade.trim()) { toast("Informe a cidade.", "warning"); return; }
    if (!estado.trim()) { toast("Informe o estado.", "warning"); return; }
    if (!aceitouLgpd) { toast("Você precisa aceitar os termos da LGPD.", "warning"); return; }

    try {
      setLoading(true);

      const response = await fetch(API_ROUTES.cadastroFuncionario, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          empresa_id: Number(empresaId),
          cargo,
          departamento,
          matricula,
          first_name: firstName,
          last_name: lastName,
          telefone,
          cpf,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado: estado.toUpperCase(),
          aceitou_lgpd: aceitouLgpd,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        toast("Resposta inválida do servidor", "error");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        toast(data.erro || "Não foi possível cadastrar o funcionário.", "error");
        return;
      }

      if (fromEmpresa) {
        toast("Funcionário cadastrado com sucesso!", "success");
        router.replace("/(tabs)/(empresa)/listar-funcionario");
      } else {
        toast("Funcionário cadastrado com sucesso! Faça login para acessar o sistema.", "success");
        router.replace("/(auth)/login");
      }
    } catch (error) {
      toast("Não foi possível conectar ao servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ["Pessoal", "Acesso", "Empresa", "Endereço"];

  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepCircle, s <= step && styles.stepCircleActive, s < step && styles.stepCircleDone]}>
            {s < step ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : (
              <Text style={[styles.stepNum, s <= step && styles.stepNumActive]}>{s}</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, s <= step && styles.stepLabelActive]}>
            {STEP_LABELS[s - 1]}
          </Text>
          {s < 4 && <View style={[styles.stepLine, s < step && styles.stepLineDone]} />}
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BackButton href={backHref} />

      <AuthHeader
        title="Cadastro Funcionário"
        subtitle={
          fromEmpresa
            ? "Adicione um novo colaborador à sua empresa"
            : "Complete os dados para acessar a plataforma de bem-estar"
        }
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
          <TextField label="CPF *" value={cpf} onChangeText={(t) => setCpf(formatarCPF(t))} placeholder="000.000.000-00" keyboardType="numeric" />

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
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          </View>

          <TextField
            label="ID da Empresa *"
            value={empresaId}
            onChangeText={setEmpresaId}
            placeholder="Ex: 1"
            keyboardType="numeric"
            editable={!fromEmpresa}
            icon="business-outline"
          />
          {fromEmpresa ? (
            <Text style={styles.lockHint}>
              Vinculado automaticamente à sua empresa.
            </Text>
          ) : null}
          <TextField label="Cargo *" value={cargo} onChangeText={setCargo} placeholder="Seu cargo" />
          <TextField label="Departamento" value={departamento} onChangeText={setDepartamento} placeholder="Seu departamento" />
          <TextField label="Matrícula" value={matricula} onChangeText={setMatricula} placeholder="Sua matrícula" />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>Voltar</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Próximo →" onPress={avancar} />
            </View>
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Endereço</Text>
          </View>

          <TextField label="CEP *" value={cep} onChangeText={(t) => setCep(formatarCEP(t))} placeholder="00000-000" keyboardType="numeric" />
          <TextField label="Endereço *" value={endereco} onChangeText={setEndereco} placeholder="Rua, Avenida..." />
          <TextField label="Número *" value={numero} onChangeText={setNumero} placeholder="Nº" />
          <TextField label="Complemento" value={complemento} onChangeText={setComplemento} placeholder="Apto, Bloco..." />
          <TextField label="Bairro *" value={bairro} onChangeText={setBairro} placeholder="Seu bairro" />
          <TextField label="Cidade *" value={cidade} onChangeText={setCidade} placeholder="Sua cidade" />
          <TextField label="Estado *" value={estado} onChangeText={setEstado} placeholder="UF" autoCapitalize="characters" />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAceitouLgpd(!aceitouLgpd)}>
            <View style={[styles.checkbox, aceitouLgpd && styles.checkboxChecked]}>
              {aceitouLgpd && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>
              Declaro que li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados pessoais conforme a LGPD.
            </Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
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
    </KeyboardAvoidingView>
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

  // Checkbox LGPD
  checkboxRow: {
    flexDirection: "row", alignItems: "flex-start", marginTop: 12, marginBottom: 16, gap: 12,
  },
  checkbox: {
    width: 24, height: 24, borderWidth: 2, borderColor: colors.primary,
    borderRadius: 6, marginTop: 2, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkboxText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 },
  lockHint: {
    marginTop: -8,
    marginBottom: 14,
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
  },
});
