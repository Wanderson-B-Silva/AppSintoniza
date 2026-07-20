import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="(clientes)"
        options={{ title: "Cliente", href: null }}
      />
      <Tabs.Screen
        name="(psicologo)"
        options={{ title: "Psicólogo", href: null }}
      />
      <Tabs.Screen
        name="(empresa)"
        options={{ title: "Empresa", href: null }}
      />
      {/* Hide unused screens from tab bar */}
      <Tabs.Screen name="consultas" options={{ href: null }} />
      <Tabs.Screen name="conteudo" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="questionarios" options={{ href: null }} />
    </Tabs>
  );
}
