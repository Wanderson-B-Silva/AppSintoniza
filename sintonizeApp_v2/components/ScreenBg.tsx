import { View, StyleSheet } from "react-native";
import { AnimatedBackground } from "./AnimatedBackground";

/**
 * Envolve uma tela com o fundo animado padrao.
 * Uso:
 *   <ScreenBg>
 *     <ScrollView style={{ backgroundColor: "transparent" }}> ... </ScrollView>
 *   </ScreenBg>
 * O conteudo deve ter fundo transparente para o efeito aparecer.
 */
export function ScreenBg({
  children,
  tint = "light",
}: {
  children: React.ReactNode;
  tint?: "light" | "dark";
}) {
  return (
    <View style={styles.root}>
      <AnimatedBackground tint={tint} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
