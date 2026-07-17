import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";

export default function Layout() {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8F6F1" } }} /></QueryClientProvider>;
}
