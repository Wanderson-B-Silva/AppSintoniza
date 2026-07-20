// =============================================================
// Sintoniza · Design tokens
// Escala consistente de espaçamento, raio, tipografia e sombras.
// =============================================================
import { Platform, ViewStyle } from "react-native";
import { colors } from "./colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 999,
};

export const font = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  weight: {
    regular: "500" as const,
    medium: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
    black: "900" as const,
  },
};

// Sombras prontas (iOS + Android elevation)
const make = (
  opacity: number,
  radiusV: number,
  height: number,
  elevation: number
): ViewStyle => ({
  shadowColor: "#0F172A",
  shadowOpacity: opacity,
  shadowRadius: radiusV,
  shadowOffset: { width: 0, height },
  elevation,
});

export const shadow = {
  none: {} as ViewStyle,
  xs: make(0.04, 6, 2, 1),
  sm: make(0.06, 10, 3, 3),
  md: make(0.1, 16, 6, 6),
  lg: make(0.16, 24, 10, 10),
  // sombra colorida para botões primários
  primary: {
    shadowColor: colors.primary,
    shadowOpacity: Platform.OS === "ios" ? 0.35 : 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  } as ViewStyle,
};

export const theme = { colors, spacing, radius, font, shadow };
export default theme;
