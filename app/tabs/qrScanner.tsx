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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useServer } from '@/contexts/ServerContext'; // Context hook for sharing server IP
import { Camera, CameraView } from 'expo-camera'; // expo-camera provides QR scanning capability
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QRScannerScreen() {
  // Get serverIP state and setter from Context API (shared across all tabs)
  const { serverIP, setServerIP } = useServer();
  
  // Track camera permission status: null=loading, true=granted, false=denied
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Track whether QR code has been scanned (prevents multiple scans)
  const [scanned, setScanned] = useState(false);
  
  // Local state to display the scanned IP (also stored in context)
  const [scannedIP, setScannedIP] = useState<string | null>(null);
  
  // Animated opacity value for smooth transitions
  const [cameraOpacity] = useState(new Animated.Value(1));
  const [successOpacity] = useState(new Animated.Value(0));

  // Animate opacity when scanned state changes
  useEffect(() => {
    if (scanned) {
      // Fade out camera, fade in success
      Animated.parallel([
        Animated.timing(cameraOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade in camera, fade out success
      Animated.parallel([
        Animated.timing(cameraOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scanned, cameraOpacity, successOpacity]);

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
      
      <ThemedText style={styles.subtitle}>
        {!scanned ? 'Scan QR code to get server IP address' : 'Successfully Scanned!'}
      </ThemedText>
      
      <View style={styles.scannerContainer}>
        <Animated.View style={[styles.animatedView, { opacity: cameraOpacity }]} pointerEvents={scanned ? 'none' : 'auto'}>
          {/* CameraView provides live camera feed with barcode detection */}
          <CameraView
            onBarcodeScanned={handleBarCodeScanned} // Callback when QR detected
            barcodeScannerSettings={{
              barcodeTypes: ['qr'], // Only scan QR codes (ignore barcodes, etc.)
            }}
            style={styles.camera}
          />
        </Animated.View>
        <Animated.View style={[styles.successContent, { opacity: successOpacity }]} pointerEvents={scanned ? 'auto' : 'none'}>
          <ThemedText type="subtitle" style={styles.serverLabel}>Server IP Address:</ThemedText>
          <Text style={styles.ipAddress}>{scannedIP}</Text>
        </Animated.View>
      </View>
      
      {scanned && (
        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
          <Text style={styles.scanAgainButtonText}>Scan Again</Text>
        </TouchableOpacity>
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
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  scannerContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#8FD49D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  serverLabel: {
    color: '#8FD49D',
    fontSize: 16,
  },
  ipAddress: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#8FD49D',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    // shadowColor: '#8FD49D',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.5,
    // shadowRadius: 8,
    // elevation: 4,
  },
  scanAgainButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
});
