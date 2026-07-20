import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  text: string;
  selected: boolean;
  onPress: () => void;
};

export function OptionCard({ text, selected, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.card, selected && styles.selected]}>
      <View style={styles.checkbox}>{selected ? <View style={styles.dot} /> : null}</View>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  selected: { borderColor: colors.mint, borderWidth: 2 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1, borderColor: colors.text,
    alignItems: "center", justifyContent: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.text },
  text: { fontSize: 15, color: colors.text, flex: 1 },
});