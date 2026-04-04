/**
 * Author: Alexangelo Orozco Gutierrez
 * Date Created: 2026 January 15
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 2026 March 13
 * 
 * QR Code Scanner Screen
 * 
 * This component uses expo-camera to scan QR codes containing server IP addresses.
 * The scanned IP is shared across tabs using React Context (ServerContext).
 * 
 * Flow:
 * 1. Request camera permissions on mount
 * 2. Display CameraView with barcode scanner enabled
 * 3. When QR code is detected, extract IP address
 * 4. Store IP in global context for Send/Receive tabs
 * 5. Hide camera and display scanned IP
 */

import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import { CameraView, Camera } from 'expo-camera'; // expo-camera provides QR scanning capability
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useServer } from '@/contexts/ServerContext'; // Context hook for sharing server IP

export default function HomeScreen() {
  // Get serverIP state and setter from Context API (shared across all tabs)
  const { serverIP, setServerIP } = useServer();
  
  // Track camera permission status: null=loading, true=granted, false=denied
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Track whether QR code has been scanned (prevents multiple scans)
  const [scanned, setScanned] = useState(false);
  
  // Local state to display the scanned IP (also stored in context)
  const [scannedIP, setScannedIP] = useState<string | null>(null);

  // Request camera permissions when component mounts
  // Required before accessing device camera for QR scanning
  // Permission prompt defined in Info.plist (NSCameraUsageDescription)
  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  /**
   * Called when CameraView detects a QR code
   * 
   * @param type - Barcode type (e.g., 'qr', 'code128')
   * @param data - String content of the QR code (e.g., 'http://192.168.1.100:3001/')
   * 
   * The QR code should contain the full server URL with protocol and port.
   * This IP is stored in Context so Send/Receive tabs can make HTTP requests.
   */
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return; // Prevent multiple scans of the same QR code
    setScanned(true);
    setScannedIP(data); // Display locally
    setServerIP(data); // Store in context for other tabs to access
  };

  /**
   * Reset scanner state to allow scanning a different QR code
   */
  const resetScanner = () => {
    setScanned(false);
    setScannedIP(null);
  };

  if (hasPermission === null) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }

  if (hasPermission === false) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No access to camera</ThemedText>
        <ThemedText>Please enable camera permissions in settings</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>QR Code Scanner</ThemedText>
      
      {!scanned ? (
        <>
          <ThemedText style={styles.subtitle}>Scan QR code to get server IP address</ThemedText>
          <View style={styles.cameraContainer}>
            {/* CameraView provides live camera feed with barcode detection */}
            <CameraView
              onBarcodeScanned={handleBarCodeScanned} // Callback when QR detected
              barcodeScannerSettings={{
                barcodeTypes: ['qr'], // Only scan QR codes (ignore barcodes, etc.)
              }}
              style={styles.camera}
            />
          </View>
        </>
      ) : (
        <>
          <ThemedText style={styles.subtitle}>Successfully Scanned!</ThemedText>
          <View style={styles.resultContainer}>
            <ThemedText type="subtitle">Server IP Address:</ThemedText>
            <Text style={styles.ipAddress}>{scannedIP}</Text>
          </View>
          <Button title="Scan Again" onPress={resetScanner} />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    marginTop: 60,
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  resultContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  ipAddress: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 10,
    fontFamily: 'monospace',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
});
