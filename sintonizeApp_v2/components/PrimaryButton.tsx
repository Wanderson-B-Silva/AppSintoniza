import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { radius, font, shadow } from "../theme/tokens";

type Variant = "primary" | "black" | "mint" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
};

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  style,
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = true,
}: Props) {
  const v = variant === "black" ? "primary" : variant; // compat
  const isOutline = v === "outline" || v === "ghost";
  const tint =
    v === "mint"
      ? colors.primary
      : isOutline
      ? colors.primary
      : "#FFFFFF";

  const containerStyle = [
    styles.base,
    sizeStyles[size],
    v === "primary" && styles.primary,
    v === "mint" && styles.mint,
    v === "danger" && styles.danger,
    v === "outline" && styles.outline,
    v === "ghost" && styles.ghost,
    v === "primary" && shadow.primary,
    fullWidth && { alignSelf: "stretch" as const },
    (disabled || loading) && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={tint} style={styles.iconLeft} />}
          <Text style={[styles.text, fontSizes[size], { color: tint }]}>{title}</Text>
          {iconRight && (
            <Ionicons name={iconRight} size={18} color={tint} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.md },
  md: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: radius.lg },
  lg: { paddingVertical: 17, paddingHorizontal: 24, borderRadius: radius.lg },
});

const fontSizes = StyleSheet.create({
  sm: { fontSize: font.size.sm },
  md: { fontSize: font.size.md },
  lg: { fontSize: font.size.lg },
});

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: colors.primary },
  mint: { backgroundColor: colors.mint },
  danger: { backgroundColor: colors.danger },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.5 },
  text: { fontWeight: font.weight.bold, letterSpacing: 0.2 },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
