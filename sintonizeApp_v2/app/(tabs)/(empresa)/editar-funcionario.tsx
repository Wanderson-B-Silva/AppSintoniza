import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { appAlert } from "../../../services/feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../../theme/colors";
import { API_ROUTES } from "../../../services/api";

export default function EditarFuncionario() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [cargo, setCargo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [matricula, setMatricula] = useState("");

  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const [erros, setErros] = useState<Record<string, string>>({});

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

  const validarEmail = (valor: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  };

  useEffect(() => {
    if (id) carregarFuncionario();
  }, [id]);

  const carregarFuncionario = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_ROUTES.funcionarioPorId}/${id}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      });

      const raw = await response.text();
      console.log("STATUS GET FUNC:", response.status);
      console.log("RESPOSTA GET FUNC:", raw);

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { erro: raw || "Resposta inválida do servidor" };
      }

      if (!response.ok) {
        appAlert("Erro", data.erro || "Não foi possível carregar o funcionário.");
        return;
      }

      setUsername(data.usuario?.username || "");
      setFirstName(data.usuario?.first_name || "");
      setLastName(data.usuario?.last_name || "");
      setEmail(data.usuario?.email || "");
      setTelefone(data.usuario?.telefone || "");
      setCargo(data.cargo || "");
      setDepartamento(data.departamento || "");
      setMatricula(data.matricula || "");
      setCpf(data.cpf || "");
      setCep(data.cep || "");
      setEndereco(data.endereco || "");
      setNumero(data.numero || "");
      setComplemento(data.complemento || "");
      setBairro(data.bairro || "");
      setCidade(data.cidade || "");
      setEstado(data.estado || "");
    } catch (error) {
      console.log("ERRO GET FUNC:", error);
      appAlert("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const validarCampos = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!username.trim()) novosErros.username = "Usuário é obrigatório";
    if (!firstName.trim()) novosErros.firstName = "Nome é obrigatório";
    if (!email.trim()) novosErros.email = "Email é obrigatório";
    else if (!validarEmail(email)) novosErros.email = "Email inválido";
    if (!cargo.trim()) novosErros.cargo = "Cargo é obrigatório";
    if (!cpf.trim()) novosErros.cpf = "CPF é obrigatório";
    else if (!validarCPF(cpf)) novosErros.cpf = "CPF inválido";
    if (!cep.trim()) novosErros.cep = "CEP é obrigatório";
    else if (apenasNumeros(cep).length !== 8) novosErros.cep = "CEP inválido";
    if (!endereco.trim()) novosErros.endereco = "Endereço é obrigatório";
    if (!numero.trim()) novosErros.numero = "Número é obrigatório";
    if (!bairro.trim()) novosErros.bairro = "Bairro é obrigatório";
    if (!cidade.trim()) novosErros.cidade = "Cidade é obrigatória";
    if (!estado.trim()) novosErros.estado = "Estado é obrigatório";

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvarAlteracoes = async () => {
    if (!validarCampos()) {
      appAlert("Atenção", "Corrija os campos destacados em vermelho.");
      return;
    }

    try {
      setSaving(true);

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_ROUTES.funcionarioPorId}/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          usuario: {
            username,
            first_name: firstName,
            last_name: lastName,
            email,
            telefone,
          },
          cargo,
          departamento,
          matricula,
          cpf,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado: estado.toUpperCase(),
        }),
      });

      const raw = await response.text();
      console.log("STATUS PATCH FUNC:", response.status);
      console.log("RESPOSTA PATCH FUNC:", raw);

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { erro: raw || "Resposta inválida do servidor" };
      }

      if (!response.ok) {
        appAlert("Erro", data.erro || "Não foi possível atualizar.");
        return;
      }

      appAlert("Sucesso", "Funcionário atualizado com sucesso.");
      router.back();
    } catch (error) {
      console.log("ERRO PATCH FUNC:", error);
      appAlert("Erro", "Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Editar Funcionário</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.section}>Dados da conta</Text>
      <Input label="Usuário *" value={username} onChangeText={setUsername} erro={erros.username} />
      <Input label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" erro={erros.email} />

      <Text style={styles.section}>Dados pessoais</Text>
      <Input label="Nome *" value={firstName} onChangeText={setFirstName} erro={erros.firstName} />
      <Input label="Sobrenome" value={lastName} onChangeText={setLastName} />
      <Input label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <Input label="CPF *" value={cpf} onChangeText={(t) => setCpf(formatarCPF(t))} keyboardType="numeric" erro={erros.cpf} />

      <Text style={styles.section}>Dados profissionais</Text>
      <Input label="Cargo *" value={cargo} onChangeText={setCargo} erro={erros.cargo} />
      <Input label="Departamento" value={departamento} onChangeText={setDepartamento} />
      <Input label="Matrícula" value={matricula} onChangeText={setMatricula} />

      <Text style={styles.section}>Endereço</Text>
      <Input label="CEP *" value={cep} onChangeText={(t) => setCep(formatarCEP(t))} keyboardType="numeric" erro={erros.cep} />
      <Input label="Endereço *" value={endereco} onChangeText={setEndereco} erro={erros.endereco} />
      <Input label="Número *" value={numero} onChangeText={setNumero} erro={erros.numero} />
      <Input label="Complemento" value={complemento} onChangeText={setComplemento} />
      <Input label="Bairro *" value={bairro} onChangeText={setBairro} erro={erros.bairro} />
      <Input label="Cidade *" value={cidade} onChangeText={setCidade} erro={erros.cidade} />
      <Input label="Estado *" value={estado} onChangeText={setEstado} maxLength={2} autoCapitalize="characters" erro={erros.estado} />

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={salvarAlteracoes}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Salvando..." : "Salvar alterações"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  erro?: string;
};

function Input({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  maxLength,
  autoCapitalize = "sentences",
  erro,
}: InputProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, erro ? styles.inputErro : null]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
      {erro ? <Text style={styles.erroText}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 22,
    paddingTop: 50,
    backgroundColor: "#EEF4F6",
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  section: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
    color: "#1F2937",
  },
  fieldContainer: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputErro: {
    borderColor: "#DC2626",
    borderWidth: 2,
  },
  erroText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
