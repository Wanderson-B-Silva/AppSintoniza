import { TouchableOpacity, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { colors } from "../theme/colors";
import { radius, font } from "../theme/tokens";

type Props = {
  href?: string;
  label?: string;
  onPress?: () => void;
};

export function BackButton({ href, label = "Voltar", onPress }: Props) {
  const handleBack = () => {
    if (onPress) return onPress();
    if (href) {
      router.replace(href as any);
      return;
    }
    if (router.canGoBack()) router.back();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleBack} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
      </View>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 18,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
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
  text: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.primary,
  },
});
