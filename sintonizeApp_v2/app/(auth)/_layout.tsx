import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="register-cli" />
      <Stack.Screen name="register-emp" />
      <Stack.Screen name="register-psi" />
      <Stack.Screen name="esqueci_senha" />
      <Stack.Screen name="verification_cod" />
      <Stack.Screen name="nova_senha" />
    </Stack>
  );
}
