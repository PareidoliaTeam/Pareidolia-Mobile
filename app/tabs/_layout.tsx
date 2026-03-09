import { Ionicons } from '@expo/vector-icons';
import { Stack, Tabs, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function TabsLayout() {
  const router = useRouter();

  return (
    <>
      {/* <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/qrScanner')} style={{ marginRight: 16, padding: 10 }}>
              <Ionicons name="qr-code-outline" size={24} style={{ transform: [{ translateX: 8 }, { translateY: -4 }] }} color="#8FD49D" />
            </TouchableOpacity>
          ),
        }}
      /> */}

      <Tabs
        screenOptions={{
          headerShown: false,
          headerTitleAlign: 'center',
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopWidth: 1,
            borderTopColor: '#1C1C1E',
          },
          tabBarActiveTintColor: '#8FD49D',
          tabBarInactiveTintColor: '#999',
        }}>
        <Tabs.Screen
          name="camera"
          options={{
            title: 'Camera',
            tabBarLabel: 'Camera',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="camera-outline" color={color} size={size} />
            ),
          }}
        /> 
        <Tabs.Screen
          name="profiles"   
          options={{
            title: 'Profiles',
            tabBarLabel: 'Profiles',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="classify"   
          options={{
            title: 'Classify',
            tabBarLabel: 'Classify',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="move-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="logStuff"   
          options={{
            title: 'Logs',
            tabBarLabel: 'Logs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}