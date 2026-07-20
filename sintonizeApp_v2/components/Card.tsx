import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevation?: "xs" | "sm" | "md" | "lg" | "none";
};

export function Card({ children, style, padded = true, elevation = "sm" }: Props) {
  return (
    <View
      style={[
        styles.card,
        shadow[elevation],
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  padded: { padding: 18 },
});
