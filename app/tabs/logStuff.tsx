/*
 * Author: Armando Vega
 * Date Created: 2026 January 15
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 2026 March 13
 * 
 * Description : Fetches the list of models from the server/desktop client that the user can download to their phone.
 * The model downloaded will be added to the model profiles and the user can then choose that model profile to use for
 * real-time inferencing. The screen also displays the currently connected server IP address and the status of the fetch request.
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useServer } from '@/contexts/ServerContext'; // Access server IP from QR scanner
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { downloadModelFile } from "../../hooks/useVideoStorage";
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type FileDict = {
    [datasetName: string]: {
        [fileName: string]: {
            size: number;
            type: string;
            uploadedAt: string;
        }
    }
}

interface FileItem {
  name: string;
  size: number;
  uploadedAt: string;
  type: string;
  datasetName?: string; // Optional dataset name for categorization
}

// type FilesResponse = {
//   files: FileItem[];
//   count: number;
//   timestamp: string;
//   mock?: boolean;
// }

// type FetchLabelsFilesRes = {
//   [labelName: string]: {
//     path: string;
//   };
// }

type FetchModelFilesListRes = {
  [modelName: string]: {
    path: string;
    labels: {
      [labelName: string]: {
        [datasetName: string]: { path: string };
      };
    };
  };
};

export default function ReceiveScreen() {
  // Get server IP from Context (set by QR scanner on Connect tab)
  const { serverIP } = useServer();
  
  // State for file list received from server
  const [files, setFiles] = useState<FetchModelFilesListRes>({});
  
  // Loading state while fetch request is in progress
  const [loading, setLoading] = useState(false);
  
  // Error message if fetch fails
  const [error, setError] = useState<string | null>(null);
  
  // Timestamp of last successful fetch
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const [downloading, setDownloading] = useState<string | null>(null); // State for model download

  const [downloadedModelMessage, setDownloadedModelMessage] = useState<string | null>(null); // State for downloaded model path
  
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
  
  /**
   * Fetch model list from server using HTTP GET request
   * 
   * Constructs URL from scanned server IP and makes GET request to /get-models endpoint.
   * Server responds with JSON containing array of model objects.
   * 
   * Example:
   * GET http://192.168.1.100:3001/get-models
   * Response: 
   * {
   *   "Flowers": {
        "path": "/Users/ezedi/Documents/PareidoliaApp/models/Flowers",
        "labels": {
          "Daisy": {
            "daisy": "/Users/ezedi/Documents/PareidoliaApp/datasets/daisy"
          },
          "Rose": {
            "roses": "/Users/ezedi/Documents/PareidoliaApp/datasets/roses"
          },
          "Sunflower": {
            "sunflowers": "/Users/ezedi/Documents/PareidoliaApp/datasets/sunflowers"
          },
          "Dandelion": {
            "dandelion": "/Users/ezedi/Documents/PareidoliaApp/datasets/dandelion"
          },
          "Tulip": {
            "tulips": "/Users/ezedi/Documents/PareidoliaApp/datasets/tulips"
          }
        }
      }
    }
   */
  const fetchModelsList = async () => {
    if (!serverIP) {
      setError('No server IP address. Please scan QR code on Connect tab.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build URL - normalize by removing trailing slash to avoid double-slash in path
      const baseURL = serverIP.replace(/\/$/, '');
      const fetchURL = baseURL.startsWith('http') 
        ? `${baseURL}/get-models`
        : `http://${baseURL}:3001/get-models`;
      
      // Make GET request to server (no body needed for GET)
      const response = await fetch(fetchURL);
      
      // Check HTTP status code (200-299 = success)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Parse JSON response from server
      const data: FetchModelFilesListRes = await response.json();
      
      const dict: FetchModelFilesListRes = data; // Assuming server already sends in desired format

      setFiles(dict);
      setLastFetch(new Date().toLocaleTimeString());

      console.log('Fetch complete. Files received:', dict);
    } catch (err) {
      setError(err instanceof Error ? err.message + "\nCheck desktop/server connection" : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  /**
   * @description handles the actual downloading of the model files when user choooses to download the file.
   * @param modelName 
   * @returns 
   */
  const fetchModel = async (modelName: string) => {
    if (!serverIP) {
      setError('No server IP address. Please scan QR code on Connect tab.');
      return;
    }

    setLoading(true);
    setError(null);

    console.log(`Attempting to download model: ${modelName} from server: ${serverIP}`);

    try {
      setDownloading(modelName);
      await downloadModelFile(modelName, serverIP);
      setDownloadedModelMessage(`Model ${modelName} downloaded successfully.`);
      console.log(`Model ${modelName} downloaded successfully.`);



    } catch (err) {
      setError(err instanceof Error ? err.message + "\nCheck desktop/server connection" : 'Failed to fetch model');
    } finally {
      setLoading(false);
      setDownloading(null);
    }
  };

  // const formatFileSize = (bytes: number) => {
  //   if (bytes < 1024) return bytes + ' B';
  //   else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  //   else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  //   else return (bytes / 1073741824).toFixed(1) + ' GB';
  // };

  return (
    <ThemedView style={styles.container}>

      <Modal
        visible={downloadedModelMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDownloadedModelMessage(null);
          
        }}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.modalBox}>
            <ThemedText style={styles.modalTitle}>Download Complete</ThemedText>
            <ThemedText style={styles.modalBody}>{downloadedModelMessage}</ThemedText>
            <TouchableOpacity style={styles.modalButton} onPress={() => setDownloadedModelMessage(null)}>
              <ThemedText style={styles.buttonText}>OK</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      <ThemedText type="title" style={styles.title}>Receive Files</ThemedText>
      
      <ThemedView style={styles.statusContainer}>
        {serverIP ? (
          <ThemedText style={styles.statusText}>Connected to: {serverIP}</ThemedText>
        ) : (
          <ThemedText style={styles.errorText}>Not connected - scan QR code first</ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <ThemedView 
          style={[styles.button, !serverIP && styles.buttonDisabled]}
          onTouchEnd={serverIP ? fetchModelsList : undefined}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Loading...' : 'Fetch Models'}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}

      {lastFetch && (
        <ThemedText style={styles.lastFetchText}>Last fetched: {lastFetch}</ThemedText>
      )}

      <ScrollView 
        style={styles.fileList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchModelsList} />
        }
      >
        {loading && Object.keys(files).length === 0 ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : Object.keys(files).length === 0 ? (
          <ThemedText style={styles.emptyText}>No models yet. Tap "Fetch Models" to load.</ThemedText>
        ) : (
          Object.entries(files).map(([modelName, fields]) => (
            <ThemedView key={modelName} style={styles.fileItem}>
              <ThemedText style={styles.fileName}>{modelName}</ThemedText>
              <ThemedText style={styles.fileDetails}>{fields.path}</ThemedText>
              <TouchableOpacity
                style={styles.button}
                onPress={() => fetchModel(modelName)}
                disabled={downloading !== null}
              >
                <ThemedText style={styles.buttonText}>{downloading === modelName ? 'Downloading...' : 'Download'}</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginTop: 20,
    marginBottom: 20,
  },
  statusContainer: {
    padding: 12,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
  },
  lastFetchText: {
    fontSize: 12,
    marginBottom: 10,
    opacity: 0.6,
  },
  fileList: {
    flex: 1,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    opacity: 0.6,
  },
  fileItem: {
    padding: 15,
    backgroundColor: 'rgba(100, 100, 100, 0.05)',
    borderRadius: 8,
    marginBottom: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  fileDetails: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 3,
  },
  fileDate: {
    fontSize: 12,
    opacity: 0.5,
  },
    modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  }
});
