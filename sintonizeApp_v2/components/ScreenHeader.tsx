import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { colors } from "../theme/colors";
import { radius, font } from "../theme/tokens";

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  bg?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  backHref?: string;
  onBack?: () => void;
  action?: Action;
};

export function ScreenHeader({
  title,
  subtitle,
  back = true,
  backHref,
  onBack,
  action,
}: Props) {
  const handleBack = () => {
    if (onBack) return onBack();
    if (backHref) return router.replace(backHref as any);
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={styles.wrap}>
      {back ? (
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <View style={styles.titleArea}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action ? (
        <TouchableOpacity
          style={[styles.iconBtn, action.bg ? { backgroundColor: action.bg } : null]}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <Ionicons name={action.icon} size={20} color={action.color || colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  titleArea: { flex: 1, alignItems: "center" },
  title: {
    fontSize: font.size.xl,
    fontWeight: font.weight.heavy,
    color: colors.primary,
  },
  subtitle: {
    fontSize: font.size.xs,
    color: colors.muted,
    marginTop: 2,
  },
});
