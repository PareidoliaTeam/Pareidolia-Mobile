import { ServerProvider } from "@/contexts/ServerContext";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
// import { clearImagPickerCache } from "../hooks/useVideoStorage";

export default function RootLayout() {
  // useEffect(() => {
  //   clearImagPickerCache();
  // }, []);
  const userRouter = useRouter();

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
          headerShown: true,
        }}
      />
      {/* <Stack.Screen
        name="tabs"
        options={{
          // title: 'Camera',  // or whatever you want here
          headerRight: () => (
            <TouchableOpacity onPress={() => userRouter.push('/qrScanner')} style={{ marginRight: 16, padding: 10 }}>
              <Ionicons 
                name="qr-code-outline" 
                size={24} 
                color="#8FD49D" 
                // style={{ transform: [{ translateX: 8 }, { translateY: -4 }] }} 
              />            
            </TouchableOpacity>
          ),
        }}
      /> */}
    </Stack>
    </ServerProvider>
  );
}