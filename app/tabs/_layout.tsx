import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
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
            <Ionicons name="camera" color={color} size={size} />
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
  );
}