/*
 *   Author: Armando Vega
 *   Date Created: 9 February 2026
 *
 *   Last Modified By: Armando Vega
 *   Date Last Modified: 13 March 2026
 *
 *   Description: Tab that allows users to continuously classify what the camera sees in real time.
 */

import { useTensorflowModel } from "@/hooks/useTensorFlowModel"; // hook to load the model
import { getModelProfilesList, getSelectedModelProfile } from "@/hooks/useVideoStorage";
import { Ionicons } from '@expo/vector-icons'; // For icons in the header
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"; // useState for state management, useRef for camera reference
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native"; // RN components
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera'; // For continuous camera feed
import { useResizePlugin } from 'vision-camera-resize-plugin'; // For resizing frames
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';

export default function Index() {
  const devices = useCameraDevices();
  const device = devices.find(device => device.position === 'back');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraRef = useRef<Camera>(null);

  const navigation = useNavigation();
  const router = useRouter();

  const [selectedModelProfileName, setSelectedModelProfileName] = useState<string | null>(null);
  
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [modelLabels, setModelLabels] = useState<string[]>([]);
  const [inputShape, setInputShape] = useState<number[] | null>(null);
  const [outputShape, setOutputShape] = useState<number[] | null>(null);
  const [displayLabel, setDisplayLabel] = useState<string>(''); // State to hold the label to display on the screen
  const lastLabel = useSharedValue("");

  // updating display label from the frame processor using useRunOnJS to run on the JS thread
  const updateDisplayLabel = useRunOnJS((label: string) => {
    setDisplayLabel((prev) => (prev === label ? prev : label));
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset state when screen is focused
      setIsCameraOpen(false);
      setDisplayLabel('');
    }, [])
  );

  // Load the model profile and associated labels when the screen is focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        const modelName = await getSelectedModelProfile();
        const profiles = await getModelProfilesList();
        if(!isActive) return;

        const profile = profiles[modelName?.trim() || ''] || null;
        if (profile) {
          setModelPath(profile.path);
          const loadedLabels = Object.keys(profile.labels);
          setModelLabels(loadedLabels);
          setSelectedModelProfileName(modelName);
          console.log(`Loaded model profile: ${modelName} with path: ${profile.path} and labels: ${loadedLabels}`);
        } else {
          console.warn('No model profile found for selected profile:', modelName);
        }
      };
      load();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const { model, loading, error } = useTensorflowModel(modelPath); // Load the model using the path from storage
  
  // Once the model is loaded, get the input and output shapes for processing frames correctly
  useFocusEffect(
    useCallback(() => {
      if (!model) return;
      const inputShape = model.inputs[0].shape; // Assuming single input tensor
      const outputShape = model.outputs[0].shape; // Assuming single output tensor
      setInputShape(inputShape);
      setOutputShape(outputShape);
      console.log('Model input shape:', inputShape);
      console.log('Model output shape:', outputShape);
      return () => {

      };
    }, [model])
  );

  // Set up header button to navigate to QR Scanner
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

  /**
   * @description Frame processor that runs on each frame to take the YUV frame, convert it
   * to RGB, resize it to the input shape of the model, run the inference and display the 
   * corresponding label based on the output
   * @params frame - the camera frame to process
   * @returns void
   * @notes - The frame processor runs on a separate thread and uses worklets, so we use 
   * useRunOnJS to update the display label on the JS thread. The predicted label is only 
   * updated if it changes from the last predicted label to avoid unnecessary re-renders.
   */
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!model) return;
    const data = resize(frame, { // capture YUV frame
      scale: {                   // resize to desired size (can be changed dynamically later)
        width: inputShape ? inputShape[1] : 224,   // default to 224 if input shape not available
        height: inputShape ? inputShape[2] : 224,  // default to 224 if input shape not available
      },
      pixelFormat: 'rgb',        // convert YUV to RGB
      dataType: 'uint8',         // use uint8 format for size overhead
    });
    
    const output = model.runSync([data]); // run the inference to get the predictions; 2D list of size 1 x n where n is the number of classes
    const res = output[0];                // get the first predictions for the first image (there will only ever be one)
    const maxIndex = res.indexOf(Math.max(...res)); // take the max prediction for the most likely detected class
    const predictedLabel = modelLabels[maxIndex] || 'Unknown'; // Use the loaded labels or default to 'Unknown'

    console.log('Predicted Label: ', predictedLabel);
    console.log('RES: ', res);
    if (predictedLabel !== lastLabel.value) {
      lastLabel.value = predictedLabel;
      updateDisplayLabel(predictedLabel);
    }

  }, [model, inputShape, modelLabels, updateDisplayLabel, lastLabel]);

  /**
   * @description Handles opening the camera for live classification
   * @returns {Promise<void>}
   */
  const handleOpenCamera = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission == 'denied') {
      alert('Camera permission is required for continuous classification');
      return;
    }
    setIsCameraOpen(true);
  }

  if (!modelPath) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>No model loaded. Please download a model first.</Text></View>
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading model...</Text></View>
  if (error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Error: {error.message}</Text></View>

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, marginBottom: 20 }}>{selectedModelProfileName || 'Unknown'} Classifier</Text>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>{displayLabel}</Text>
      {!isCameraOpen && (
        <>
          <View style={{ height: 10 }} />
          <Button title="Open Camera for Live Classification" onPress={handleOpenCamera} />
        </>
      )}

      {isCameraOpen && device && (
        
        <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.closeButton} onPress={() => {setIsCameraOpen(false); setDisplayLabel('')}} >
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