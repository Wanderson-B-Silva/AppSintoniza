import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors } from "../theme/colors";
import { radius, font, shadow } from "../theme/tokens";
import {
  tabBarTranslate,
  toggleTabBar,
  showTabBar,
  isTabBarHidden,
} from "./tabBarStore";

/**
 * Barra de navegacao inferior flutuante, moderna e RECOLHIVEL.
 * - Esconde sozinha ao rolar a tela para baixo e volta ao rolar para cima.
 * - Tem uma alca para mostrar/esconder na hora (aparece quando voce pedir).
 * - Apenas telas que definem `tabBarIcon` aparecem na barra.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(isTabBarHidden());

  // acompanha o valor global para trocar o icone da alca e os toques
  useEffect(() => {
    const id = tabBarTranslate.addListener(({ value }) => {
      setHidden(value > 60);
    });
    return () => tabBarTranslate.removeListener(id);
  }, []);

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const visible = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => !!descriptors[route.key].options.tabBarIcon);

  const opacity = tabBarTranslate.interpolate({
    inputRange: [0, 130],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      {/* Alca para mostrar/esconder */}
      <TouchableOpacity
        style={styles.handle}
        onPress={() => {
          haptic();
          toggleTabBar();
        }}
        activeOpacity={0.85}
      >
        <Ionicons name={hidden ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
        {hidden && <Text style={styles.handleText}>Menu</Text>}
      </TouchableOpacity>

      {/* Barra */}
      <Animated.View
        style={{ opacity, transform: [{ translateY: tabBarTranslate }] }}
        pointerEvents={hidden ? "none" : "auto"}
      >
        <View style={styles.bar}>
          {visible.map(({ route, index }) => {
            const { options } = descriptors[route.key];
            const label = (options.title as string) ?? route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              haptic();
              showTabBar();
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const color = isFocused ? "#FFFFFF" : colors.subtle;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                activeOpacity={0.8}
                style={[styles.item, isFocused && styles.itemActive]}
              >
                <View style={styles.iconRow}>
                  {options.tabBarIcon
                    ? options.tabBarIcon({ focused: isFocused, color, size: 22 })
                    : null}
                  {isFocused ? (
                    <Text numberOfLines={1} style={styles.labelActive}>
                      {label}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  handle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: 8,
    ...shadow.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  handleText: { fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.primary },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    ...shadow.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  itemActive: { backgroundColor: colors.primary, paddingHorizontal: 16, ...shadow.primary },
  iconRow: { flexDirection: "row", alignItems: "center" },
  labelActive: {
    color: "#FFFFFF",
    fontWeight: font.weight.bold,
    fontSize: font.size.sm,
    marginLeft: 7,
  },
});
