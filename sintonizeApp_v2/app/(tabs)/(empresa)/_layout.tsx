import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FloatingTabBar } from "../../../components/FloatingTabBar";

export default function EmpresaLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="tela_inicial"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="listar-funcionario"
        options={{
          title: "Equipe",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: "Relatórios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />

      {/* Telas internas (não aparecem na barra) */}
      <Tabs.Screen name="editar-funcionario" options={{ href: null }} />
    </Tabs>
  );
}
