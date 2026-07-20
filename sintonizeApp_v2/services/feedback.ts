import { Alert, Platform } from "react-native";

// =============================================================
// Ponte de "alerta" usável em qualquer lugar (não precisa de hook).
//
// Regra (if/else) pedida:
//  - No CELULAR (iOS/Android): usa o Alert nativo (funciona bem).
//  - No NAVEGADOR (web): usa o toast/modal do FeedbackProvider,
//    porque o Alert nativo não aparece de forma confiável na web.
//
// Basta trocar `Alert.alert(...)` por `appAlert(...)` — a assinatura
// é a mesma do Alert.alert.
// =============================================================

export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type ToastType = "success" | "error" | "info" | "warning";

type FeedbackApi = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
};

let api: FeedbackApi | null = null;

/** Chamado uma vez pelo FeedbackProvider para registrar o toast/confirm. */
export function registerFeedback(a: FeedbackApi) {
  api = a;
}

function tipoPorTexto(title?: string, message?: string): ToastType {
  const t = `${title || ""} ${message || ""}`.toLowerCase();
  if (/(sucesso|salvo|cadastrad|atualizad|enviad|conclu)/.test(t)) return "success";
  if (/(erro|falha|inválid|invalid|não foi|nao foi|negad)/.test(t)) return "error";
  if (/(atenç|aten\u00e7|aviso|preencha|obrigat)/.test(t)) return "warning";
  return "info";
}

export function appAlert(title: string, message?: string, buttons?: AlertButton[]) {
  // Celular → Alert nativo (comportamento original, confiável).
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons as any);
    return;
  }

  // Navegador → usa o FeedbackProvider, se disponível.
  if (!api) {
    // fallback extremo (não deve acontecer): tenta o nativo
    Alert.alert(title, message, buttons as any);
    return;
  }

  const btns = buttons || [];
  const acionaveis = btns.filter((b) => b.style !== "cancel");
  const cancelar = btns.find((b) => b.style === "cancel");

  // 1 ação ou nenhuma → toast informativo e dispara a ação (se houver).
  if (btns.length <= 1) {
    api.toast(message || title, tipoPorTexto(title, message));
    btns[0]?.onPress?.();
    return;
  }

  // 2+ botões → modal de confirmação (if = confirmar / else = cancelar).
  const principal = acionaveis[acionaveis.length - 1] || acionaveis[0];
  api
    .confirm({
      title,
      message,
      confirmText: principal?.text || "Confirmar",
      cancelText: cancelar?.text || "Cancelar",
      destructive: btns.some((b) => b.style === "destructive"),
    })
    .then((ok) => {
      if (ok) principal?.onPress?.();
      else cancelar?.onPress?.();
    });
}
