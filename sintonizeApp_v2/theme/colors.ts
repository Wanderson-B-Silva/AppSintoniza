// =============================================================
// Sintoniza · Paleta de cores
// Mantém as chaves originais (compatibilidade) e adiciona tons
// extras usados pelo novo design system.
// =============================================================
export const colors = {
  // --- Marca ---
  primary: "#1E2A78",        // azul Sintoniza
  primaryDark: "#141C57",
  primaryLight: "#2D3D9E",
  primarySoft: "#EEF1FF",    // fundo de realce azul

  mint: "#9AD9B4",
  mintDark: "#5FBF8C",
  mintSoft: "#E7F7EE",

  // --- Neutros ---
  black: "#0F172A",
  text: "#1F2937",
  textStrong: "#0F172A",
  muted: "#6B7280",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  line: "#EEF2F6",
  bg: "#EEF4F6",
  bgSoft: "#F1F5F9",
  card: "#FFFFFF",
  white: "#FFFFFF",

  // --- Estados ---
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  info: "#2563EB",
  infoSoft: "#DBEAFE",

  // --- Saúde mental (níveis) ---
  healthGood: "#10B981",
  healthMid: "#F59E0B",
  healthRisk: "#EF4444",
};

export type AppColors = typeof colors;
