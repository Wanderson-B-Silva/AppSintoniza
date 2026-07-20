import { Animated, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/**
 * Controle global da visibilidade do menu flutuante.
 * translateY: 0 = visivel, ~130 = escondido (desce para fora da tela).
 * Usado tanto pelo auto-esconder ao rolar quanto pelo botao manual.
 */
export const tabBarTranslate = new Animated.Value(0);
let hidden = false;

export function hideTabBar() {
  if (hidden) return;
  hidden = true;
  Animated.timing(tabBarTranslate, {
    toValue: 130,
    duration: 220,
    useNativeDriver: true,
  }).start();
}

export function showTabBar() {
  if (!hidden) return;
  hidden = false;
  Animated.timing(tabBarTranslate, {
    toValue: 0,
    duration: 220,
    useNativeDriver: true,
  }).start();
}

export function toggleTabBar() {
  if (hidden) showTabBar();
  else hideTabBar();
}

export function isTabBarHidden() {
  return hidden;
}

/**
 * Cria um handler de scroll que esconde o menu ao rolar para baixo
 * e mostra ao rolar para cima. Use em ScrollView/FlatList:
 *   const onScroll = createTabBarScrollHandler();
 *   <ScrollView onScroll={onScroll} scrollEventThrottle={16} ...>
 */
export function createTabBarScrollHandler() {
  let last = 0;
  return (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > last + 6 && y > 50) hideTabBar();
    else if (y < last - 6) showTabBar();
    last = y;
  };
}
