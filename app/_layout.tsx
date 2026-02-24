import { useEffect } from "react";
import { Stack } from "expo-router";
import { ServerProvider } from "@/contexts/ServerContext";
// import { clearImagPickerCache } from "../hooks/useVideoStorage";

export default function RootLayout() {
  // useEffect(() => {
  //   clearImagPickerCache();
  // }, []);

  return (
    <ServerProvider>
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    </ServerProvider>
  );
}