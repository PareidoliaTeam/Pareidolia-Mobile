/*
 *   Author: Armando Vega
 *   Date Created: 9 Feb 2026
 *
 *   Last Modified By: Armando Vega
 *   Date Last Modified: 9 Feb 2026
 *
 *   Description: Tab that allows users to continuously classify what the camera sees in real time.
 */

import { useRouter, useNavigation } from "expo-router";
import { useTensorflowModel } from "@/hooks/useTensorFlowModel"; // hook to load the model
import { useLayoutEffect, useRef, useState } from "react"; // useState for state management, useRef for camera reference
import { Button, Image, Text, View, StyleSheet, TouchableOpacity } from "react-native"; // RN components
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera'; // For continuous camera feed
import { useResizePlugin } from 'vision-camera-resize-plugin'; // For resizing frames
import { Ionicons } from '@expo/vector-icons'; // For icons in the header

const labels = ['roses', 'daisy', 'dandelion', 'sunflowers', 'tulips']; // Example labels for flower classification

export default function Index() {
  // Get available camera devices (must be inside component)
  const devices = useCameraDevices();
  const device = devices.find(device => device.position === 'back');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { model, loading, error } = useTensorflowModel(require('@/assets/models/model_u8_in_f32_out_flower_hope.tflite')); // expects uint8 of shape (1, 180, 180, 3) which is batch size 1, images of 180 x 180, 3 color channels
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation();
  const router = useRouter();
  
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/qrScanner')}
          style={{
            marginRight: 12,
            width: 56,
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
          }}
        >
            <Ionicons name="qr-code-outline" size={24} style={{ transform: [{ translateX: 7 }, { translateY: -10 }] }} color="#8FD49D" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Setup resize plugin and frame processor only when model is loaded
  const { resize } = useResizePlugin();
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!model) return;
    const data = resize(frame, { // capture YUV frame
      scale: {                   // resize to desired size (can be changed dynamically later)
        width: 180,
        height: 180,
      },
      pixelFormat: 'rgb',        // convert YUV to RGB
      dataType: 'uint8',         // use uint8 format for size overhead
    });
    
    const output = model.runSync([data]); // run the inference to get the predictions; 2D list of size 1 x n where n is the number of classes
    const res = output[0];                // get the first predictions for the first image (there will only ever be one)
    const maxIndex = res.indexOf(Math.max(...res)); // take the max prediction for the most likely detected class
    const predictedLabel = labels[maxIndex];       

    console.log('Predicted Label: ', predictedLabel);
    console.log('RES: ', res);
  }, [model]);

  if (loading) return <Text>Loading...</Text>
  if (error) return <Text>Error: {error.message}</Text>
  if (!model) return null // Safety check

  // Debug: log device info
  console.log('Camera device:', device);

  const handleOpenCamera = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission == 'denied') {
      alert('Camera permission is required for continuous classification');
      return;
    }
    setIsCameraOpen(true);
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Flower Classifier</Text>

      {!isCameraOpen && (
        <>
          <View style={{ height: 10 }} />
          <Button title="Open Camera for Live Classification" onPress={handleOpenCamera} />
        </>
      )}

      {isCameraOpen && device && (
        
        <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsCameraOpen(false)} >
            <Text style={{color: "blue"}}>
                Close Camera
            </Text>
          </TouchableOpacity>
          <Camera
            ref={cameraRef}
            style={{ width: 480, height: 480, marginBottom: 20 }}
            device={device}
            isActive={isCameraOpen}
            frameProcessor={frameProcessor}
          />
        </View>
        
      )}
      {isCameraOpen && !device && (
        <Text>No camera device found. Please check your device or permissions.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    closeButton: {
        zIndex: 2,
        margin: 20
    }
});