import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Easing, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type Orb = {
  size: number;
  color: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  range: number;
  duration: number;
  delay?: number;
};

const ORBS: Orb[] = [
  { size: 320, color: "#9AD9B4", top: -80, left: -70, range: 40, duration: 7000 },
  { size: 280, color: "#1E2A78", top: 120, right: -90, range: 55, duration: 9000, delay: 600 },
  { size: 240, color: "#5FBF8C", bottom: -60, left: -40, range: 48, duration: 8000, delay: 1200 },
  { size: 200, color: "#2D3D9E", bottom: 80, right: -50, range: 36, duration: 10000, delay: 400 },
];

function FloatingOrb({ orb }: { orb: Orb }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: orb.duration,
          delay: orb.delay || 0,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [orb, t]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, orb.range] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, -orb.range * 0.6] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  const pos: ViewStyle = {
    top: orb.top,
    left: orb.left,
    right: orb.right,
    bottom: orb.bottom,
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        pos,
        {
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: orb.color,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

/**
 * Fundo animado padrão. Coloque como primeiro filho de uma tela com
 * container de fundo transparente (ou translúcido) para o efeito aparecer.
 */
export function AnimatedBackground({
  base = colors.bg,
  tint = "light",
}: {
  base?: string;
  tint?: "light" | "dark";
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base }]}>
      {ORBS.map((orb, i) => (
        <FloatingOrb key={i} orb={orb} />
      ))}
      {/* véu para suavizar e manter o texto legível */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tint === "dark" ? "rgba(15,23,42,0.35)" : "rgba(244,248,250,0.62)" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    opacity: 0.5,
  },
});
