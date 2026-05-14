/*
 * Author: Armando Vega
 * Date Created: 2026 January 15
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 2026 March 13
 * 
 * Description : This file defines the layout for the tabs in the application, 
 * including the icons and styles for each tab. It uses the Expo Router to manage 
 * navigation between different screens in the app. Each tab is associated with a 
 * specific screen and has its own icon and label for easy identification by the user.
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

// Shows the tabs information and icons at the bottom
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
            headerShown: false,
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
            headerShown: false,
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
            headerShown: false,
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
            headerShown: false,
            tabBarLabel: 'Import',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="qrScanner"   
          options={{
            title: 'Connect',
            headerShown: false,
            tabBarLabel: 'Connect',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="qr-code-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profileVideos"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
    );
  }