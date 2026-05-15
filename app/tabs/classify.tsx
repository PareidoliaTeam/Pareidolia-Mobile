/*
 *   Author: Armando Vega
 *   Date Created: 9 February 2026
 *
 *   Last Modified By: Armando Vega
 *   Date Last Modified: 13 March 2026
 *
 *   Description: Tab that allows users to continuously classify what the camera sees in real time.
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTensorflowModel } from "@/hooks/useTensorFlowModel"; // hook to load the model
import { getModelProfilesList, getSelectedModelProfile } from "@/hooks/useVideoStorage";
import { Ionicons } from '@expo/vector-icons'; // For icons in the header
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"; // useState for state management, useRef for camera reference
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native"; // RN components
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera'; // For continuous camera feed
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin'; // For resizing frames

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
  const [inputDataType, setInputDataType] = useState<'uint8' | 'float32'>('uint8');
  const [modelInputError, setModelInputError] = useState<string | null>(null);
  const [displayLabel, setDisplayLabel] = useState<string>(''); // State to hold the label to display on the screen
  const lastLabel = useSharedValue("");
  const isClassifying = useSharedValue(false);
  const isScreenFocusedRef = useRef(false);

  // Animated opacity values for smooth camera transitions
  // closeButtonOpacity starts at 1 since camera is closed by default
  const [cameraOpacity] = useState(new Animated.Value(0));
  const [closeButtonOpacity] = useState(new Animated.Value(1));

  // updating display label from the frame processor using useRunOnJS to run on the JS thread
  const updateDisplayLabel = useRunOnJS((label: string) => {
    if (!isScreenFocusedRef.current) return;
    setDisplayLabel((prev) => (prev === label ? prev : label));
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset state when screen is focused
      isScreenFocusedRef.current = true;
      isClassifying.value = false;
      lastLabel.value = "";
      setIsCameraOpen(false);
      setDisplayLabel('');

      return () => {
        isScreenFocusedRef.current = false;
        isClassifying.value = false;
        lastLabel.value = "";
        setIsCameraOpen(false);
        setDisplayLabel('');
      };
    }, [isClassifying, lastLabel])
  );

  useEffect(() => {
    isClassifying.value = isCameraOpen && isScreenFocusedRef.current;
    if (!isCameraOpen) {
      lastLabel.value = "";
    }
  }, [isCameraOpen, isClassifying, lastLabel]);

  // Animate opacity when camera opens/closes
  useEffect(() => {
    if (isCameraOpen) {
      // Fade in camera, fade out button
      Animated.parallel([
        Animated.timing(cameraOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(closeButtonOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out camera, fade in button
      Animated.parallel([
        Animated.timing(cameraOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(closeButtonOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCameraOpen, cameraOpacity, closeButtonOpacity]);

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
      const inputTensor = model.inputs[0]; // Assuming single input tensor
      const inputShape = inputTensor.shape;
      const outputShape = model.outputs[0].shape; // Assuming single output tensor
      const dataType = inputTensor.dataType === 'float32' ? 'float32' : 'uint8';
      setInputShape(inputShape);
      setInputDataType(dataType);
      console.log('Model input shape:', inputShape);
      console.log('Model input type:', inputTensor.dataType);
      console.log('Model output shape:', outputShape);

      if (inputShape[1] <= 1 || inputShape[2] <= 1) {
        const message = 'This downloaded model has a 1x1 input. Retrain and download the model again.';
        console.warn(message, inputShape);
        setModelInputError(message);
      } else {
        setModelInputError(null);
      }
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
  }, [navigation, router]);

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
    if (!isClassifying.value) return;
    if (!model) return;
    if (!inputShape) return;
    if (inputShape[1] <= 1 || inputShape[2] <= 1) return;

    const modelHeight = inputShape[1];
    const modelWidth = inputShape[2];
    const data = resize(frame, { // capture YUV frame
      scale: {                   // resize to desired size (can be changed dynamically later)
        width: modelWidth,
        height: modelHeight,
      },
      pixelFormat: 'rgb',        // convert YUV to RGB
      dataType: inputDataType,
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

  }, [model, inputShape, inputDataType, modelLabels, updateDisplayLabel, lastLabel, isClassifying]);

  /**
   * @description Handles opening the camera for live classification
   * @returns {Promise<void>}
   */
  const handleOpenCamera = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'denied') {
      alert('Camera permission is required for continuous classification');
      return;
    }
    if (!isScreenFocusedRef.current) return;
    isClassifying.value = true;
    setIsCameraOpen(true);
  }

  if (!modelPath) return <ThemedView style={styles.container}><ThemedText>No model loaded. Please download a model first.</ThemedText></ThemedView>
  if (loading) return <ThemedView style={styles.container}><ThemedText>Loading model...</ThemedText></ThemedView>
  if (error) return <ThemedView style={styles.container}><ThemedText>Error: {error.message}</ThemedText></ThemedView>
  if (modelInputError) return <ThemedView style={styles.container}><ThemedText>{modelInputError}</ThemedText></ThemedView>

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>{selectedModelProfileName || 'Unknown'} Classifier</ThemedText>
      
      <ThemedText style={styles.predictionLabel}>{displayLabel || 'Model Ready'}</ThemedText>
      
      <View style={styles.cameraContainer}>
        <Animated.View style={[styles.cameraAnimatedView, { opacity: cameraOpacity }]} pointerEvents={isCameraOpen ? 'auto' : 'none'}>
          {device && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={isCameraOpen}
              frameProcessor={frameProcessor}
            />
          )}
        </Animated.View>

        <Animated.View style={[styles.startButtonOverlay, { opacity: closeButtonOpacity }]} pointerEvents={isCameraOpen ? 'none' : 'auto'}>
          <TouchableOpacity style={styles.startButton} onPress={handleOpenCamera}>
            <Text style={styles.startButtonText}>Start Classification</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.stopButtonOverlay, { opacity: cameraOpacity }]} pointerEvents={isCameraOpen ? 'auto' : 'none'}>
          <TouchableOpacity style={styles.stopButton} onPress={() => { isClassifying.value = false; setIsCameraOpen(false); setDisplayLabel(''); }}>
            <Text style={styles.stopButtonText}>Stop Classification</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
  },
  predictionLabel: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#8FD49D',
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#8FD49D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraAnimatedView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  startButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stopButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingRight: 12,
  },
  startButton: {
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
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    // shadowColor: '#FF6B6B',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.4,
    // shadowRadius: 4,
    // elevation: 3,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
