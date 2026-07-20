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

const PORTES = ["MEI", "Micro Empresa", "Pequena Empresa", "Média Empresa", "Grande Empresa"];

export default function RegisterEmpresa() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Conta de acesso
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 - Dados da empresa
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [emailCorporativo, setEmailCorporativo] = useState("");
  const [telefoneEmpresa, setTelefoneEmpresa] = useState("");

  // Step 3 - Representante legal
  const [representanteNome, setRepresentanteNome] = useState("");
  const [representanteCpf, setRepresentanteCpf] = useState("");
  const [representanteCargo, setRepresentanteCargo] = useState("");
  const [representanteEmail, setRepresentanteEmail] = useState("");
  const [representanteTelefone, setRepresentanteTelefone] = useState("");

  // Step 4 - Endereço
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  // Step 5 - Informações extras
  const [ramoAtividade, setRamoAtividade] = useState("");
  const [porteEmpresa, setPorteEmpresa] = useState("");
  const [quantidadeFuncionarios, setQuantidadeFuncionarios] = useState("");
  const [responsavelRh, setResponsavelRh] = useState("");
  const [emailRh, setEmailRh] = useState("");

  const [aceitouLgpd, setAceitouLgpd] = useState(false);

  const apenasNumeros = (valor: string) => valor.replace(/\D/g, "");
  const validarEmail = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

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

  const formatarCNPJ = (valor: string) => {
    const v = apenasNumeros(valor).slice(0, 14);
    return v
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
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
    if (!username.trim()) { appAlert("Atenção", "Informe um nome de usuário."); return false; }
    if (!email.trim()) { appAlert("Atenção", "Informe o email de login."); return false; }
    if (!validarEmail(email)) { appAlert("Atenção", "Email de login inválido."); return false; }
    if (!password.trim()) { appAlert("Atenção", "Informe uma senha."); return false; }
    if (password.length < 6) { appAlert("Atenção", "A senha deve ter pelo menos 6 caracteres."); return false; }
    if (password !== confirmPassword) { appAlert("Atenção", "As senhas não coincidem."); return false; }
    return true;
  };

  const validarStep2 = () => {
    if (!razaoSocial.trim()) { appAlert("Atenção", "Informe a razão social."); return false; }
    if (!cnpj.trim() || apenasNumeros(cnpj).length !== 14) { appAlert("Atenção", "CNPJ inválido."); return false; }
    if (emailCorporativo && !validarEmail(emailCorporativo)) { appAlert("Atenção", "Email corporativo inválido."); return false; }
    return true;
  };

  const validarStep3 = () => {
    if (!representanteNome.trim()) { appAlert("Atenção", "Informe o nome do representante."); return false; }
    if (!representanteCpf.trim() || !validarCPF(representanteCpf)) { appAlert("Atenção", "CPF do representante inválido."); return false; }
    if (representanteEmail && !validarEmail(representanteEmail)) { appAlert("Atenção", "Email do representante inválido."); return false; }
    return true;
  };

  const validarStep4 = () => {
    if (!cep.trim() || apenasNumeros(cep).length !== 8) { appAlert("Atenção", "CEP inválido."); return false; }
    if (!endereco.trim()) { appAlert("Atenção", "Informe o endereço."); return false; }
    if (!numero.trim()) { appAlert("Atenção", "Informe o número."); return false; }
    if (!bairro.trim()) { appAlert("Atenção", "Informe o bairro."); return false; }
    if (!cidade.trim()) { appAlert("Atenção", "Informe a cidade."); return false; }
    if (!estado.trim()) { appAlert("Atenção", "Informe o estado."); return false; }
    return true;
  };

  const avancar = () => {
    if (step === 1 && validarStep1()) setStep(2);
    else if (step === 2 && validarStep2()) setStep(3);
    else if (step === 3 && validarStep3()) setStep(4);
    else if (step === 4 && validarStep4()) setStep(5);
  };

  const handleRegister = async () => {
    if (emailRh && !validarEmail(emailRh)) { appAlert("Atenção", "Email do RH inválido."); return; }
    if (!aceitouLgpd) { appAlert("Atenção", "Você precisa aceitar os termos da LGPD."); return; }

    try {
      setLoading(true);

      const response = await fetch(API_ROUTES.cadastroEmpresa, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia,
          cnpj,
          email_corporativo: emailCorporativo,
          telefone_empresa: telefoneEmpresa,
          representante_nome: representanteNome,
          representante_cpf: representanteCpf,
          representante_cargo: representanteCargo,
          representante_email: representanteEmail,
          representante_telefone: representanteTelefone,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado: estado.toUpperCase(),
          ramo_atividade: ramoAtividade,
          porte_empresa: porteEmpresa,
          quantidade_funcionarios: Number(quantidadeFuncionarios || 0),
          responsavel_rh: responsavelRh,
          email_rh: emailRh,
          aceitou_lgpd: aceitouLgpd,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        appAlert("Erro", "Resposta inválida do servidor");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        appAlert("Erro", data.erro || "Não foi possível cadastrar a empresa.");
        return;
      }

      appAlert("Sucesso", "Empresa cadastrada com sucesso! Faça login para acessar o sistema.");
      router.replace("/(auth)/login");
    } catch (error) {
      appAlert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ["Acesso", "Empresa", "Representante", "Endereço", "Extras"];

  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3, 4, 5].map((s) => (
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
          {s < 5 && <View style={[styles.stepLine, s < step && styles.stepLineDone]} />}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton href="/(auth)/register" />

      <AuthHeader
        title="Cadastro Empresa"
        subtitle="Complete os dados da empresa e do representante legal"
      />

      <StepIndicator />

      {step === 1 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Conta de Acesso</Text>
          </View>

          <TextField label="Usuário (login) *" value={username} onChangeText={setUsername} placeholder="seu.usuario" autoCapitalize="none" />
          <TextField label="Email de login *" value={email} onChangeText={setEmail} placeholder="exemplo@email.com" keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Senha *" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />
          <TextField label="Confirmar Senha *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repita a senha" secureTextEntry />

          <PrimaryButton title="Próximo →" onPress={avancar} style={styles.nextBtn} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          </View>

          <TextField label="Razão Social *" value={razaoSocial} onChangeText={setRazaoSocial} placeholder="Razão social da empresa" />
          <TextField label="Nome Fantasia" value={nomeFantasia} onChangeText={setNomeFantasia} placeholder="Nome fantasia" />
          <TextField label="CNPJ *" value={cnpj} onChangeText={(t) => setCnpj(formatarCNPJ(t))} placeholder="00.000.000/0000-00" keyboardType="numeric" />
          <TextField label="Email Corporativo" value={emailCorporativo} onChangeText={setEmailCorporativo} placeholder="contato@empresa.com" keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Telefone da Empresa" value={telefoneEmpresa} onChangeText={setTelefoneEmpresa} placeholder="(00) 0000-0000" keyboardType="phone-pad" />

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
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Representante Legal</Text>
          </View>

          <TextField label="Nome do Representante *" value={representanteNome} onChangeText={setRepresentanteNome} placeholder="Nome completo" />
          <TextField label="CPF do Representante *" value={representanteCpf} onChangeText={(t) => setRepresentanteCpf(formatarCPF(t))} placeholder="000.000.000-00" keyboardType="numeric" />
          <TextField label="Cargo" value={representanteCargo} onChangeText={setRepresentanteCargo} placeholder="Cargo na empresa" />
          <TextField label="Email" value={representanteEmail} onChangeText={setRepresentanteEmail} placeholder="email@representante.com" keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Telefone" value={representanteTelefone} onChangeText={setRepresentanteTelefone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />

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
            <Text style={styles.sectionTitle}>Endereço da Empresa</Text>
          </View>

          <TextField label="CEP *" value={cep} onChangeText={(t) => setCep(formatarCEP(t))} placeholder="00000-000" keyboardType="numeric" />
          <TextField label="Endereço *" value={endereco} onChangeText={setEndereco} placeholder="Rua, Avenida..." />
          <TextField label="Número *" value={numero} onChangeText={setNumero} placeholder="Nº" />
          <TextField label="Complemento" value={complemento} onChangeText={setComplemento} placeholder="Sala, Andar..." />
          <TextField label="Bairro *" value={bairro} onChangeText={setBairro} placeholder="Bairro" />
          <TextField label="Cidade *" value={cidade} onChangeText={setCidade} placeholder="Cidade" />
          <TextField label="Estado *" value={estado} onChangeText={setEstado} placeholder="UF" autoCapitalize="characters" />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>Voltar</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Próximo →" onPress={avancar} />
            </View>
          </View>
        </View>
      )}

      {step === 5 && (
        <View style={styles.stepContent}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Informações Extras</Text>
          </View>

          <TextField label="Ramo de Atividade" value={ramoAtividade} onChangeText={setRamoAtividade} placeholder="Ex: Tecnologia, Saúde..." />

          <Text style={styles.selectHint}>Porte da empresa:</Text>
          {PORTES.map((porte) => (
            <TouchableOpacity
              key={porte}
              style={[styles.optionCard, porteEmpresa === porte && styles.optionCardActive]}
              onPress={() => setPorteEmpresa(porte)}
            >
              <View style={[styles.optionRadio, porteEmpresa === porte && styles.optionRadioActive]}>
                {porteEmpresa === porte && <View style={styles.optionRadioDot} />}
              </View>
              <Text style={[styles.optionText, porteEmpresa === porte && styles.optionTextActive]}>{porte}</Text>
            </TouchableOpacity>
          ))}

          <TextField label="Quantidade de Funcionários" value={quantidadeFuncionarios} onChangeText={setQuantidadeFuncionarios} placeholder="Ex: 50" keyboardType="numeric" />
          <TextField label="Responsável pelo RH" value={responsavelRh} onChangeText={setResponsavelRh} placeholder="Nome do responsável" />
          <TextField label="Email do RH" value={emailRh} onChangeText={setEmailRh} placeholder="rh@empresa.com" keyboardType="email-address" autoCapitalize="none" />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAceitouLgpd(!aceitouLgpd)}>
            <View style={[styles.checkbox, aceitouLgpd && styles.checkboxChecked]}>
              {aceitouLgpd && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>
              Declaro que li e aceito a Política de Privacidade e autorizo o tratamento dos dados da empresa e do representante legal conforme a LGPD.
            </Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(4)}>
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
  stepLabel: { fontSize: 10, fontWeight: "600", color: "#94A3B8", marginLeft: 4, marginRight: 4 },
  stepLabelActive: { color: colors.primary },
  stepLine: { width: 14, height: 2, backgroundColor: "#CBD5E1" },
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

  // Porte selector (estilo do psicólogo)
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
});
