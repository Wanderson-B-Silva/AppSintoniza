import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function BrandHeader() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>Sintoniza</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 10, paddingBottom: 10 },
  brand: { fontSize: 18, fontWeight: "600", color: colors.text },
});