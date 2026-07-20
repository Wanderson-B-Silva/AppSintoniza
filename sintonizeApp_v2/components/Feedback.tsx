import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableOpacity,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { radius, font, shadow } from "../theme/tokens";
import { registerFeedback } from "../services/feedback";

type ToastType = "success" | "error" | "info" | "warning";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type FeedbackApi = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const TYPE_CFG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: "checkmark-circle", color: colors.success, bg: "#ECFDF5" },
  error: { icon: "close-circle", color: colors.danger, bg: "#FEF2F2" },
  info: { icon: "information-circle", color: colors.info, bg: "#EFF6FF" },
  warning: { icon: "alert-circle", color: colors.warning, bg: "#FFFBEB" },
};

// Fallback caso o hook seja usado fora do provider: usa o Alert nativo.
const FeedbackContext = createContext<FeedbackApi>({
  toast: (m) => Alert.alert("", m),
  confirm: (o) =>
    new Promise((res) =>
      Alert.alert(o.title, o.message, [
        { text: o.cancelText || "Cancelar", style: "cancel", onPress: () => res(false) },
        { text: o.confirmText || "Confirmar", onPress: () => res(true) },
      ])
    ),
});

export const useFeedback = () => useContext(FeedbackContext);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  // ---- Toast ----
  const [toastState, setToastState] = useState<{ message: string; type: ToastType } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToastState({ message, type });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToastState(null)
        );
      }, 2800);
    },
    [anim]
  );

  // ---- Confirm ----
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    setConfirmState(null);
    resolver.current?.(value);
    resolver.current = null;
  };

  // Disponibiliza toast/confirm para a função global appAlert.
  useEffect(() => {
    registerFeedback({ toast, confirm });
  }, [toast, confirm]);

  const cfg = toastState ? TYPE_CFG[toastState.type] : null;

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast */}
      {toastState && cfg && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { backgroundColor: cfg.bg, borderColor: cfg.color },
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
              ],
            },
          ]}
        >
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
          <Text style={[styles.toastText, { color: cfg.color }]} numberOfLines={3}>
            {toastState.message}
          </Text>
        </Animated.View>
      )}

      {/* Confirm */}
      <Modal visible={!!confirmState} transparent animationType="fade" onRequestClose={() => closeConfirm(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{confirmState?.title}</Text>
            {confirmState?.message ? (
              <Text style={styles.dialogMsg}>{confirmState.message}</Text>
            ) : null}
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => closeConfirm(false)} activeOpacity={0.8}>
                <Text style={styles.btnCancelText}>{confirmState?.cancelText || "Cancelar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnConfirm, confirmState?.destructive && { backgroundColor: colors.danger }]}
                onPress={() => closeConfirm(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.btnConfirmText}>{confirmState?.confirmText || "Confirmar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadow.md,
  },
  toastText: { flex: 1, fontSize: font.size.sm, fontWeight: font.weight.bold },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: radius["2xl"],
    padding: 22,
    ...shadow.lg,
  },
  dialogTitle: { fontSize: font.size.xl, fontWeight: font.weight.heavy, color: colors.textStrong },
  dialogMsg: { fontSize: font.size.md, color: colors.muted, marginTop: 8, lineHeight: 22 },
  dialogActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
  },
  btnCancelText: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  btnConfirmText: { fontSize: font.size.md, fontWeight: font.weight.bold, color: "#fff" },
});
