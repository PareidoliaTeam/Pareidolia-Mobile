import { useServer } from '@/contexts/ServerContext'; // Context hook for sharing server IP
import { useNavigation } from '@react-navigation/native';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy'; // Read files as base64
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { Alert, Button, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addProfileVideo, getDesktopVideosSent, getProfileVideos, removeProfileVideo, setDesktopVideosSent } from "../hooks/useVideoStorage";

interface FileItem {
  name: string;
  size: number;
  uploadedAt: string;
  type: string;
  datasetName?: string; // Optional dataset name for categorization
}

interface FilesResponse {
  files: FileItem[];
  count: number;
  timestamp: string;
  mock?: boolean;
}

type FileDict = {
    [datasetName: string]: {
        [fileName: string]: {
            size: number;
            type: string;
            uploadedAt: string;
        }
    }
}

function VideoPlayer({ uri, toggle, selected, onPress }: { uri: string; toggle: boolean; selected: boolean; onPress: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  return (
    <View style={{ position: 'relative' }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: 200 }}
        contentFit="cover"
        nativeControls={!toggle}
      />
      {toggle && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onPress}
          activeOpacity={0.7}
        />
)}
      {toggle && (
        <TouchableOpacity
          onPress={onPress}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#ffffff',
            backgroundColor: selected ? '#0bef16' : 'transparent',
          }}
        />
      )}
    </View>
  );
}

export default function ProfileVideos() {
  const { serverIP } = useServer(); // Access server IP from context
  const { profile } = useLocalSearchParams<{ profile: string }>();
  const [videos, setVideos] = useState<string[]>([]);
  const [toggle, setToggle] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sentVideos, setSentVideos] = useState<{ [fileName: string]: boolean }>({});
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleToggle}
          style={{
            marginRight: 12,
            width: 56,
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
          }}
        >
            <Text style={{ 
              color: !toggle ? '#fff' : '#1744e8', 
              fontWeight: 'bold', 
              fontSize: 16, 
              textAlign: 'center',
              transform: [{ translateX: 5 }, { translateY: -10 }],
            }}>
              Select
            </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, toggle]);

  useEffect(() => {
    (async () => {
      setVideos(await getProfileVideos(profile));
      const sent = await getDesktopVideosSent();
      const sentList = sent[profile] || {};
      // Build a lookup for quick access
      setSentVideos(Object.keys(sentList).reduce((acc, fileName) => {
        acc[fileName] = true;
        return acc;
      }, {} as { [fileName: string]: boolean }));
    })();
  }, [profile]);


  const [files, setFiles] = useState<FileDict>({});
  
  // Loading state while fetch request is in progress
  const [loading, setLoading] = useState(false);
  
  // Error message if fetch fails
  const [error, setError] = useState<string | null>(null);
  
  // Timestamp of last successful fetch
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  // Currently selected image/video from photo library
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  
  // Track upload progress (true while POST request is in progress)
  const [uploading, setUploading] = useState(false);
  
  // Success/error message after upload attempt
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  // Photo library permission status: null=loading, true=granted, false=denied
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Track connection test status
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    (async () => {
      setVideos(await getProfileVideos(profile));
    })();
  }, [profile]);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      await addProfileVideo(profile, result.assets[0].uri);
      setVideos(await getProfileVideos(profile));
    }
  };

  const handleRemove = async (uri: string) => {
    await removeProfileVideo(profile, uri);
    setVideos(await getProfileVideos(profile));
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      next.delete(uri);
      return next;
    });
  };

  const handleAlternateAction = (uri: string) => {
    setSelectedVideos((prev) => {
      if (prev.has(uri)) {
        const newSet = new Set(prev);
        newSet.delete(uri);
        return newSet;
      } else {
        const newSet = new Set(prev);
        newSet.add(uri);
        return newSet;
      }
    });
  };

  const handleToggle = () => {
    setToggle((prev) => !prev);
    setSelectedVideos(new Set());
  };

  const handleUpload = async () => {
    if (selectedVideos.size === 0) {
      alert('No videos selected for upload.');
      return;
    }

    if (!serverIP) {
      Alert.alert('No Server', 'Please scan QR code on Connect tab first.');
      return;
    }

    console.log('before ping');
    const pingSuccess = await pingServer();
    console.log('after ping:', pingSuccess);

    if(!pingSuccess) {
      Alert.alert('Cannot Reach Server', 'Please check your connection and try again.');
      return;
    };

    checkAgainstSentList();

    // performUpload();

    // Implement upload logic here, using serverIP from context
    // alert(`Uploading ${selectedVideos.size} videos to server at ${serverIP}`);
  };

  const checkAgainstSentList = async () => {
    const sent = await getDesktopVideosSent();
    const alreadySent = [];
    const notSent = [];

    // Build updated sent object incrementally
    const updatedSent = { ...sent, [profile]: { ...sent[profile] } };

    for (const uri of selectedVideos) {
        const fileName = uri.split('/').pop() || 'unknown';
        if (sent[profile] && sent[profile][fileName]) {
            alreadySent.push(fileName);
            selectedVideos.delete(uri);
        } else {
            notSent.push(fileName);
        }
    }

    // Save once after the loop
    // await setDesktopVideosSent(updatedSent);

    // const updated = await getDesktopVideosSent();
    // console.log(updated);

    if (alreadySent.length > 0) {
      Alert.alert(
        'Upload Warning',
        `The following videos have already been uploaded before:\n\n${alreadySent.join('\n')}\n\n`,
        [
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      performUpload(); // Proceed with uploading any new videos that weren't in the sent list
    } else {
      const updated = await getDesktopVideosSent();
      performUpload();
      console.log('All selected videos are new. Proceeding with upload.');
      console.log(updated); // Debug log to verify sent list updates
    }
  };

  const performUpload = async () => {
    console.log('📤 Starting upload process');
    console.log('Server IP from context:', serverIP);
    for(const uri of selectedVideos) {
      setUploading(true);
      setUploadStatus(null);

      try {
        // ...existing code...
        const base64 = await readAsStringAsync(uri!, {
          encoding: 'base64',
        });
        const fileName = uri!.split('/').pop() || 'upload';
        const baseURL = serverIP!.replace(/\/$/, '');
        const uploadURL = baseURL.startsWith('http') 
          ? `${baseURL}/upload-simple`
          : `http://${baseURL}:3001/upload-simple`;
        const controller = new AbortController();
        const timeoutMinutes = 10;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMinutes * 60 * 1000);
        const response = await fetch(uploadURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: fileName,
            fileData: base64,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setUploadStatus({ success: true, message: `✓ Successfully uploaded ${fileName}` });

          // Update the list of sent videos in AsyncStorage
          const currentSent = await getDesktopVideosSent();
          const fileInfo = await getInfoAsync(uri);
          const fileType = fileName.endsWith('.mp4') ? 'video/mp4' : 'unknown';
          if (!currentSent[profile]) {
            currentSent[profile] = {};
          }
          currentSent[profile][fileName] = {
            size: fileInfo.exists && !fileInfo.isDirectory ? fileInfo.size ?? 0 : 0,
            type: fileType,
            uploadedAt: new Date().toISOString(),
          };
          await setDesktopVideosSent(currentSent);

          console.log('Updated sent videos list in AsyncStorage:', currentSent);

          // Update sentVideos state immediately so outline updates
          setSentVideos(prev => ({
            ...prev,
            [fileName]: true
          }));

          // Clear selection after successful upload
          setTimeout(() => setSelectedMedia(null), 2000);
        } else {
          setUploadStatus({ success: false, message: data.message || 'Upload failed' });
        }
      } catch (err) {
        console.error('Upload error:', err);
        let errorMessage = 'Failed to upload file';
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Upload timed out (60s). File might be too large.';
          } else {
            errorMessage = err.message;
          }
        }
        setUploadStatus({
          success: false,
          message: errorMessage,
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const pingServer = async () => {
    if (!serverIP) {
      console.log('yeet');
      setError('No server IP address. Please scan QR code on Connect tab.');
      return false;
    }

    setTestingConnection(true);
    
    try {
      // Normalize the server URL by removing trailing slash
      const baseURL = serverIP.replace(/\/$/, '');
      const testURL = baseURL.startsWith('http') 
        ? `${baseURL}/test-upload`
        : `http://${baseURL}:3001/test-upload`;
      
      console.log('Testing connection to:', testURL);
      
      // Make POST request with small JSON payload
      const response = await fetch(testURL, {
        method: 'POST', // POST method for sending data
        headers: {
          'Content-Type': 'application/json', // Tell server we're sending JSON
        },
        body: JSON.stringify({ test: true }), // Convert object to JSON string
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      const responseText = await response.text();
      console.log('Response text (first 500 chars):', responseText.substring(0, 500));
      
      if (contentType && contentType.includes('application/json')) {
        const data = JSON.parse(responseText);
        console.log('Test response:', data);
        Alert.alert('Connection Test', `✅ Success! Server is reachable.\n\nResponse: ${data.message}`);
        return true;
      } else {
        Alert.alert(
          'Unexpected Response',
          `Server responded but returned ${contentType || 'unknown content type'}\n\nStatus: ${response.status}\n\nThis might be a routing or CORS issue. Check server logs.`
        );
        return true;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      Alert.alert(
        'Connection Failed', 
        `Cannot reach server at ${serverIP}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure:\n• Server is running\n• Both devices are on same WiFi\n• Firewall allows connections`
      );
      return false;
    } finally {
      setTestingConnection(false);
    }
  };

  const printSentVideos = async () => {
    const sent = await getDesktopVideosSent();
    console.log('Sent videos list from AsyncStorage:', sent);
    Alert.alert('Sent Videos', JSON.stringify(sent, null, 2));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>

      <Text style={{ color: "#fff", fontSize: 24, textAlign: "center", margin: 10 }}>
        {profile} Videos
      </Text>
      <Button title="Print Sent Videos List" onPress={printSentVideos} />
      <Button title="Add Video" onPress={pickVideo} />
      {/* <Button title={`Toggle Controls (${toggle ? "On" : "Off"})`} onPress={handleToggle} /> */}

      {toggle && selectedVideos.size > 0 && (
        <Button title="Upload Selected" onPress={handleUpload} />
       )}

      <Button title="Print Selected" onPress={() => console.log([...selectedVideos])} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {videos.length === 0 ? (

          <Text style={{ color: "#fff", textAlign: "center" }}>No videos found.</Text>

        ) : (

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {videos.map((uri) => {
              const fileName = uri.split('/').pop() || '';
              const isSent = sentVideos[fileName];
              return (
                <View
                  key={uri}
                  style={{
                    width: '48%',
                    marginBottom: 16,
                    backgroundColor: '#111',
                    borderRadius: 8,
                    overflow: 'hidden',
                    borderWidth: 3,
                    borderColor: isSent ? '#ff855c' : '#444', // Green if sent, gray otherwise
                  }}
                >
                  <VideoPlayer uri={uri} toggle={toggle} selected={selectedVideos.has(uri)} onPress={() => handleAlternateAction(uri)} />
                  <TouchableOpacity onPress={() => handleRemove(uri)} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#ff4444', textAlign: 'center' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}
