import { View, Image, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  subtitle?: string;
};

export function AuthHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />
      </View>

      <Text style={styles.title}>{title}</Text>

      {subtitle && (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 26,
  },

  logoWrap: {
    width: 130,
    height: 130,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#0F172A",
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,

    marginBottom: 14,
  },

  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7A90",
    textAlign: "center",
    maxWidth: 300,
  },
});