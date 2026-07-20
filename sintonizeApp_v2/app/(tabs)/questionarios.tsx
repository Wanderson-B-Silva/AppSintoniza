import { View, Text, StyleSheet } from "react-native";
import { useState } from "react";
import { colors } from "../../theme/colors";
import { OptionCard } from "../../components/OptionCard";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function Questionarios() {
  const [selected, setSelected] = useState<string>("");

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Sintoniza</Text>

      <Text style={styles.title}>Como esta sua mente ?</Text>

      <OptionCard text="Bem e tranquilo" selected={selected === "Bem e tranquilo"} onPress={() => setSelected("Bem e tranquilo")} />
      <OptionCard text="Um pouco cansado mas bem" selected={selected === "Um pouco cansado mas bem"} onPress={() => setSelected("Um pouco cansado mas bem")} />
      <OptionCard text="Preciso de ajuda" selected={selected === "Preciso de ajuda"} onPress={() => setSelected("Preciso de ajuda")} />

      <View style={{ marginTop: "auto" }}>
        <PrimaryButton title="Prosseguir  →" variant="mint" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 26, backgroundColor: colors.bg },
  brand: { fontSize: 16, color: colors.text, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 18 },
});