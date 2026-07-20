import { Platform } from "react-native";

const getHost = () => {
  if (Platform.OS === "android") {
    return "192.168.0.71";
  }
  if (Platform.OS === "ios") {
    return "192.168.0.71";
  }
  return "127.0.0.1";
};

const HOST = getHost();
const BASE_URL = `http://${HOST}:8000/api/usuarios`;
const BASE_QUESTIONARIOS = `http://${HOST}:8000/api/questionarios`;
const BASE_CONTEUDOS = `http://${HOST}:8000/api/conteudos`;
const BASE_MENSAGENS = `http://${HOST}:8000/api/mensagens`;
const BASE_AUDITORIA = `http://${HOST}:8000/api/auditoria`;
const BASE_PREDICAO = `http://${HOST}:8000/api/predicao`;

export const API_ROUTES = {
  // Auth
  login: `${BASE_URL}/login/`,
  loginToken: `${BASE_URL}/login/token/`,
  cadastroEmpresa: `${BASE_URL}/cadastro/empresa/`,
  cadastroFuncionario: `${BASE_URL}/cadastro/funcionario/`,
  cadastroPsicologo: `${BASE_URL}/cadastro/psicologo/`,
  resetSolicitar: `${BASE_URL}/reset-password/solicitar/`,
  resetConfirmar: `${BASE_URL}/reset-password/confirmar/`,

  // Perfil
  perfil: `${BASE_URL}/perfil/`,
  meuPerfilFuncionario: `${BASE_URL}/meu-perfil-funcionario/`,

  // Empresa
  listaFuncionariosEmpresa: `${BASE_URL}/empresa/funcionarios/`,
  funcionarioPorId: `${BASE_URL}/empresa/funcionarios`,
  excluirFuncionario: `${BASE_URL}/empresa/funcionarios`,
  estatisticasEmpresa: `${BASE_URL}/empresa/estatisticas/`,
  dashboardEmpresa: `${BASE_URL}/empresa/dashboard/`,
  relatoriosGestao: `${BASE_URL}/empresa/relatorios/`,

  // LGPD
  lgpdExportar: `${BASE_URL}/lgpd/exportar/`,
  lgpdExcluir: `${BASE_URL}/lgpd/excluir/`,

  // Questionários
  listarQuestionarios: `${BASE_QUESTIONARIOS}/listar/`,
  perguntasQuestionario: `${BASE_QUESTIONARIOS}`,
  responderQuestionario: `${BASE_QUESTIONARIOS}/responder/`,
  minhasAvaliacoes: `${BASE_QUESTIONARIOS}/minhas-avaliacoes/`,
  ultimaAvaliacao: `${BASE_QUESTIONARIOS}/ultima-avaliacao/`,
  avaliacaoDetalhe: `${BASE_QUESTIONARIOS}/avaliacao`,
  estatisticasQuestionarioEmpresa: `${BASE_QUESTIONARIOS}/estatisticas/empresa/`,
  humorEmpresa: `${BASE_QUESTIONARIOS}/empresa/humor/`,
  criarQuestionario: `${BASE_QUESTIONARIOS}/criar/`,
  avaliacoesPsicologo: `${BASE_QUESTIONARIOS}/psicologo/avaliacoes/`,
  detalheAvaliacaoPsicologo: `${BASE_QUESTIONARIOS}/psicologo/avaliacoes`,
  // Parecer do psicólogo (avaliar questionários respondidos)
  criarParecer: `${BASE_QUESTIONARIOS}/psicologo/avaliacoes`, // + /<id>/parecer/
  pareceresPsicologo: `${BASE_QUESTIONARIOS}/psicologo/pareceres/`,
  // Check-in de humor (funcionário)
  registrarCheckin: `${BASE_QUESTIONARIOS}/checkin/`,
  historicoCheckin: `${BASE_QUESTIONARIOS}/checkin/historico/`,

  // Conteúdos
  listarConteudos: `${BASE_CONTEUDOS}/listar/`,
  listarVideos: `${BASE_CONTEUDOS}/videos/`,
  listarLivros: `${BASE_CONTEUDOS}/livros/`,
  criarConteudo: `${BASE_CONTEUDOS}/criar/`,
  detalheConteudo: `${BASE_CONTEUDOS}`,

  // Mensagens
  listarConversas: `${BASE_MENSAGENS}/conversas/`,
  criarConversa: `${BASE_MENSAGENS}/conversas/criar/`,
  detalheConversa: `${BASE_MENSAGENS}/conversas`,
  enviarMensagem: `${BASE_MENSAGENS}/conversas`,

  // Auditoria
  listarLogs: `${BASE_AUDITORIA}/logs/`,
  detalheLogs: `${BASE_AUDITORIA}/logs`,
  resumoAuditoria: `${BASE_AUDITORIA}/resumo/`,

  // Predição ML
  predict: `${BASE_PREDICAO}/predict/`,
  filaPrioridade: `${BASE_PREDICAO}/fila/`,
  marcarAtendido: `${BASE_PREDICAO}/fila`,
  minhasPredicoes: `${BASE_PREDICAO}/minhas-predicoes/`,
  dashboardML: `${BASE_PREDICAO}/dashboard/`,
  infoModelo: `${BASE_PREDICAO}/info/`,
};

export default API_ROUTES;
