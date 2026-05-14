/*
 * Author: Armando Vega
 * Date Created: 2026 January 15
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 2026 March 13
 * 
 * Description : Displays all videos associated with the selected dataset profile. Users can add videos from their photo library, 
 * which are then stored in the app's async storage and the phone's Documents directory. Users can also remove videos from the profile. 
 * The screen allows users to select multiple videos to upload to the server, with checks against a sent list to prevent duplicate uploads.
 *  The screen also includes a connection test to ensure the server is reachable before attempting uploads.
 */

import { useServer } from '@/contexts/ServerContext'; // Context hook for sharing server IP
import { Ionicons } from '@expo/vector-icons';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy'; // Read files as base64
import { Image } from 'expo-image';
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { createVideoPlayer, useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, FlatList, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addProfileVideo, getDesktopVideosSent, getProfileVideos, removeProfileVideo, setDesktopVideosSent } from "../../hooks/useVideoStorage";

interface FileItem {
  name: string;
  size: number;
  uploadedAt: string;
  type: string;
  datasetName?: string;
}

// separate component prevents OOM crash since it doesn't initialize a full ExoPlayer immediately
function ActiveVideoPlayer({ uri, toggle }: { uri: string; toggle: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 200 }}
      contentFit="cover"
      nativeControls={!toggle}
    />
  );
}

// A global utility to generate a thumbnail without occupying too much memory
const normalizeVideoUri = (uri: string): string => {
  if (!uri) return uri;
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }
  return uri;
};

// On iOS, createVideoPlayer + immediate generateThumbnailsAsync returns empty arrays because
// AVPlayer loads asynchronously. We must wait for 'readyToPlay' before extracting frames.
// This uses the same AVPlayer code path that works for VideoView playback.
const generateVideoThumbnailIOS = (normalizedUri: string): Promise<any | null> => {
  return new Promise((resolve) => {
    const player = createVideoPlayer(normalizedUri);
    player.muted = true;
    player.pause();
    let settled = false;

    const done = (result: any) => {
      if (settled) return;
      settled = true;
      if (typeof player.release === 'function') player.release();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      console.warn('[thumb-ios] timed out waiting for readyToPlay', { normalizedUri });
      done(null);
    }, 10000);

    const sub = player.addListener('statusChange', async ({ status }: any) => {
      if (status !== 'readyToPlay' && status !== 'error') return;
      sub.remove();
      clearTimeout(timeout);

      if (status === 'error') {
        console.warn('[thumb-ios] player reported error status');
        done(null);
        return;
      }

      for (const t of [0, 0.5, 1.0]) {
        try {
          const thumbs = await player.generateThumbnailsAsync([t]);
          if (thumbs?.[0]) {
            console.log('[thumb-ios] success after readyToPlay', { t, width: thumbs[0].width, height: thumbs[0].height });
            done(thumbs[0]);
            return;
          }
        } catch (e) {
          console.warn('[thumb-ios] attempt failed after readyToPlay', { t, message: e instanceof Error ? e.message : String(e) });
        }
      }

      console.warn('[thumb-ios] no thumbnail after readyToPlay', { normalizedUri });
      done(null);
    });
  });
};

const generateVideoThumbnail = async (uri: string): Promise<any | null> => {
  const normalizedUri = normalizeVideoUri(uri);

  if (Platform.OS === 'ios') {
    return generateVideoThumbnailIOS(normalizedUri);
  }

  // Android: player loads synchronously (ExoPlayer), immediate call works fine
  let player: any = null;
  try {
    player = createVideoPlayer(normalizedUri);
    for (const t of [0, 0.5, 1.0]) {
      try {
        const thumbs = await player.generateThumbnailsAsync([t]);
        if (thumbs?.[0]) {
          console.log('[thumb-android] success', { t, width: thumbs[0].width, height: thumbs[0].height });
          return thumbs[0];
        }
      } catch (e) {
        console.warn('[thumb-android] attempt failed', { t, message: e instanceof Error ? e.message : String(e) });
      }
    }
    console.warn('[thumb-android] no thumbnail after all attempts', { normalizedUri });
    return null;
  } catch (error) {
    console.warn('[thumb-android] fatal error', { message: error instanceof Error ? error.message : String(error) });
    return null;
  } finally {
    if (player && typeof player.release === 'function') {
      player.release();
    }
  }
};

// video player component with toggleable native controls and selection outline (can be turned into hook later)
function VideoPlayer({ uri, toggle, selected, isPlaying, onPlay, onPress }: { uri: string; toggle: boolean; selected: boolean; isPlaying: boolean; onPlay: () => void; onPress: () => void }) {
  const [thumbnail, setThumbnail] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!uri) return;

    setThumbnail(null);
    generateVideoThumbnail(uri).then((thumb) => {
      if (isMounted) {
        setThumbnail(thumb);
      }
    });

    return () => { isMounted = false; };
  }, [uri]);

  return (
    <View style={{ position: 'relative', width: '100%', height: 200 }}>
      {isPlaying && !toggle ? (
        <ActiveVideoPlayer uri={uri} toggle={toggle} />
      ) : (
        <>
          {thumbnail ? (
            <Image source={thumbnail} contentFit="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="videocam-outline" size={48} color="#444" />
            </View>
          )}

          {!toggle && (
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}
              onPress={onPlay}
            >
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </>
      )}

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
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sentVideos, setSentVideos] = useState<{ [fileName: string]: boolean }>({});
  const navigation = useNavigation();
  const router = useRouter();

  // multi-select toggle in header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.navigate('/tabs/profiles')}
          style={{
            marginLeft: 12,
            width: 56,
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
          }}
        >
          <Text style={{
            color: '#8FD49D',
            fontWeight: 'bold',
            fontSize: 16,
            textAlign: 'center',
            transform: [{ translateX: -5 }, { translateY: -10 }],
          }}>‹ Back</Text>
        </TouchableOpacity>
      ),
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
  }, [navigation, toggle, router]);

  // Reset selection when entering or leaving the screen
  useFocusEffect(
    useCallback(() => {
      setSelectedVideos(new Set());
      setToggle(false);
      return () => {
        setSelectedVideos(new Set());
        setToggle(false);
      };
    }, [])
  );

  // Load videos for the selected profile on mount and when profile changes
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

  /**
   * @description Handles picking a video from the user's photo library and adding it to the current profile. 
   * The video URI is stored in async storage and the app's Documents directory, and the list of videos is refreshed after adding.
   */
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

  /**
   * @description Handles selecting/deselecting videos for upload. When a video is tapped in toggle mode, it is added to or removed from the selectedVideos set.
   * @param uri 
   */
  const handleVideoSelection = (uri: string) => {
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
    setPlayingVideo(null); // Stop any playing video when toggling mode
  };

  /**
   * @description handles the upload process first calling pingServer to check connection, then checks against the sent list
   * to prevent duplicate uploads, and finally calls performUpload to do the actual uploading of videos to the server with POST requests.
   * @returns 
   */
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
  };

  /**
   * @description Checks the selected videos against the list of videos already sent to the server for this profile. 
   * If any selected videos have already been sent, an alert is shown listing those videos and asking the user to confirm 
   * if they want to proceed with uploading the new videos that haven't been sent before. If all selected videos are new, 
   * it proceeds directly to upload.
   */
  const checkAgainstSentList = async () => {
    const sent = await getDesktopVideosSent();
    const alreadySent: string[] = [];

    for (const uri of selectedVideos) {
      const fileName = uri.split('/').pop() || 'unknown';
      if (sent[profile] && sent[profile][fileName]) {
        alreadySent.push(fileName);
      }
    }

    if (alreadySent.length > 0) {
      Alert.alert(
        'Already Uploaded',
        `The following videos were previously uploaded:\n\n${alreadySent.join('\n')}\n\nDo you still want to upload all selected videos?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upload Anyway', onPress: () => performUpload() },
        ]
      );
    } else {
      performUpload();
    }
  };

  /**
   * @description takes selected videos, converts them to base64, and uploads them to the server one by one with POST requests. 
   * The server endpoint is determined by the serverIP from context.
   */
  const performUpload = async () => {
    console.log('📤 Starting upload process');
    console.log('Server IP from context:', serverIP);
    for(const uri of selectedVideos) {
      setUploading(true);
      setUploadStatus(null);

      try {
        const base64 = await readAsStringAsync(uri!, {
          encoding: 'base64',
        });
        const fileName = uri!.split('/').pop() || 'upload';
        const baseURL = serverIP!.replace(/\/$/, '');
        const uploadURL = baseURL.startsWith('http') 
          ? `${baseURL}/upload-video`
          : `http://${baseURL}:3001/upload-video`;
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
            datasetName: profile
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

  /**
   * @description pings the server to see if there is a connection before upload attempts
   * @returns boolean indicating if the server is reachable.
   */
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
        ? `${baseURL}/ping`
        : `http://${baseURL}:3001/ping`;
      
      console.log('Testing connection to:', testURL);
      
      const response = await fetch(testURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      const responseText = await response.text();
      console.log('Response text (first 500 chars):', responseText.substring(0, 500));
      
      console.log("contentType:", contentType);
      console.log("responseText:", contentType?.includes('application/json'));
      console.log("responseText:", responseText);

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

  const handleSelectAll = () => {
    setSelectedVideos(new Set(videos));
  };

  const handleDeselectAll = () => {
    setSelectedVideos(new Set());
  };

  const handleSelectNew = () => {
    const newVideos = videos.filter(uri => {
      const fileName = uri.split('/').pop() || '';
      return !sentVideos[fileName];
    });
    setSelectedVideos(new Set(newVideos));
  };

  const handleRemoveWithConfirm = (uri: string) => {
    const fileName = uri.split('/').pop() || 'this video';
    Alert.alert(
      'Remove Video',
      `Are you sure you want to remove "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleRemove(uri) },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.navigate('/tabs/profiles')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingTop: 8 }}
      >
        <Ionicons name="chevron-back" size={24} color="#8FD49D" />
        <Text style={{ color: '#8FD49D', fontSize: 17 }}>Back</Text>
      </TouchableOpacity>

      {/* Centered title */}
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', paddingVertical: 10 }} numberOfLines={1}>
        {profile}
      </Text>

      {/* Action buttons row - normal mode */}
      {!toggle && (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={handleToggle}
            style={{ flex: 1, backgroundColor: '#2C2C2E', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#444' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Select</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickVideo}
            style={{ flex: 1, backgroundColor: '#8FD49D', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '600', fontSize: 13 }}>Import From Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action buttons row - select mode */}
      {toggle && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleToggle}
              style={{ flex: 1, backgroundColor: '#3a3a3a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#555' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUpload}
              disabled={selectedVideos.size === 0}
              style={{ flex: 1, backgroundColor: selectedVideos.size > 0 ? '#4A90E2' : '#1a1a3a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ color: selectedVideos.size > 0 ? '#fff' : '#555', fontWeight: '600', fontSize: 13 }}>
                {selectedVideos.size > 0 ? `Upload (${selectedVideos.size})` : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleSelectAll}
              style={{ flex: 1, backgroundColor: '#2C2C2E', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#444' }}
            >
              <Text style={{ color: '#8FD49D', fontWeight: '600', fontSize: 13 }}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSelectNew}
              style={{ flex: 1, backgroundColor: '#2C2C2E', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#444' }}
            >
              <Text style={{ color: '#4A90E2', fontWeight: '600', fontSize: 13 }}>Select New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeselectAll}
              style={{ flex: 1, backgroundColor: '#2C2C2E', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#444' }}
            >
              <Text style={{ color: '#aaa', fontWeight: '600', fontSize: 13 }}>Deselect All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {videos.length === 0 ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: "#fff", textAlign: "center" }}>No videos found.</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item: uri }) => {
            const fileName = uri.split('/').pop() || '';
            const isSent = sentVideos[fileName];
            return (
              <View
                style={{
                  width: '48%',
                  marginBottom: 16,
                  backgroundColor: '#111',
                  borderRadius: 10,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: isSent ? '#ff855c' : selectedVideos.has(uri) ? '#4A90E2' : '#333',
                }}
              >
                <VideoPlayer
                  uri={uri}
                  toggle={toggle}
                  selected={selectedVideos.has(uri)}
                  isPlaying={playingVideo === uri}
                  onPlay={() => setPlayingVideo(uri)}
                  onPress={() => handleVideoSelection(uri)}
                />
                <TouchableOpacity
                  onPress={() => handleRemoveWithConfirm(uri)}
                  style={{ marginVertical: 8, marginHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3a0000', alignItems: 'center' }}
                >
                  <Text style={{ color: '#ff4444', fontWeight: '600', fontSize: 13 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

    </SafeAreaView>
  );
}
