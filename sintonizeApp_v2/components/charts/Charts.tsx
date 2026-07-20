import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { radius, font } from "../../theme/tokens";

/* ------------------------------------------------------------------ */
/* Barra empilhada (saudável / atenção / crítico)                      */
/* ------------------------------------------------------------------ */
export type Segment = { value: number; color: string };

export function StackedBar({
  segments,
  height = 14,
  track = colors.bgSoft,
}: {
  segments: Segment[];
  height?: number;
  track?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <View style={[styles.stackTrack, { height, borderRadius: height / 2, backgroundColor: track }]}>
      {total > 0 &&
        segments.map((s, i) =>
          s.value > 0 ? (
            <View
              key={i}
              style={{
                flex: s.value,
                backgroundColor: s.color,
              }}
            />
          ) : null
        )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Gráfico de barras verticais                                         */
/* ------------------------------------------------------------------ */
export type Bar = { label: string; value: number; color?: string; sub?: string };

export function BarChart({
  data,
  height = 150,
  showValue = true,
}: {
  data: Bar[];
  height?: number;
  showValue?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={[styles.barChart, { height: height + 44 }]}>
      {data.map((d, i) => {
        const h = Math.max(6, (d.value / max) * height);
        return (
          <View key={i} style={styles.barCol}>
            {showValue ? <Text style={styles.barValue}>{d.value}</Text> : null}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: d.color || colors.primary },
                ]}
              />
            </View>
            <Text numberOfLines={1} style={styles.barLabel}>
              {d.label}
            </Text>
            {d.sub ? (
              <Text numberOfLines={1} style={styles.barSub}>
                {d.sub}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Linha de progresso com rótulo                                       */
/* ------------------------------------------------------------------ */
export function ProgressRow({
  label,
  value,
  total,
  color = colors.primary,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressPct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* KPI circular (badge)                                                */
/* ------------------------------------------------------------------ */
export function KpiBadge({
  value,
  suffix = "%",
  label,
  color = colors.primary,
  size = 116,
}: {
  value: number;
  suffix?: string;
  label?: string;
  color?: string;
  size?: number;
}) {
  const ring = Math.round(size * 0.085);
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Text style={{ fontSize: size * 0.26, fontWeight: font.weight.black, color }}>
          {value}
          <Text style={{ fontSize: size * 0.13 }}>{suffix}</Text>
        </Text>
      </View>
      {label ? <Text style={styles.kpiLabel}>{label}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Legenda (pontinho colorido + texto)                                 */
/* ------------------------------------------------------------------ */
export function LegendDot({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value?: string | number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      {value !== undefined ? <Text style={styles.legendValue}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stackTrack: { flexDirection: "row", overflow: "hidden", width: "100%" },

  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barTrack: { justifyContent: "flex-end", height: "100%" },
  bar: { width: 26, borderRadius: 8, minHeight: 6 },
  barValue: {
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  barLabel: {
    fontSize: font.size.xs,
    color: colors.muted,
    marginTop: 8,
    fontWeight: font.weight.medium,
    maxWidth: 64,
    textAlign: "center",
  },
  barSub: { fontSize: 10, color: colors.subtle, marginTop: 1 },

  progressRow: { marginBottom: 14 },
  progressHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.medium },
  progressPct: { fontSize: font.size.sm, fontWeight: font.weight.heavy },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.bgSoft,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 5 },

  kpiLabel: {
    marginTop: 10,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    color: colors.text,
  },

  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: font.size.xs, color: colors.muted, fontWeight: font.weight.medium },
  legendValue: { fontSize: font.size.xs, color: colors.text, fontWeight: font.weight.heavy },
});
