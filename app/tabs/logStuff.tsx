/**
 * Receive Files Screen
 * 
 * This component fetches a list of files from the server using a GET request.
 * The server IP comes from the QR scanner (shared via Context).
 * 
 * Flow:
 * 1. User taps "Fetch Files" button
 * 2. Makes GET request to http://{serverIP}/files
 * 3. Server responds with JSON array of file metadata
 * 4. Display list of files with name, size, type, upload time
 * 
 * HTTP GET Request Example:
 * Request:  GET http://192.168.1.100:3001/files
 * Response: { "files": [{"name": "photo.jpg", "size": 1234, ...}], "count": 1 }
 */

import { useState } from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useServer } from '@/contexts/ServerContext'; // Access server IP from QR scanner
import { addProfileVideo, getProfileVideos, removeProfileVideo } from "../../hooks/useVideoStorage";

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

interface FilesResponse {
  files: FileItem[];
  count: number;
  timestamp: string;
  mock?: boolean;
}

interface FetchLabelsFilesResponse {
  [labelName: string]: {
    filePath: string;
  };
}

interface FetchModelFilesResponse {
  [modelName: string]: {
    filePath: string;
  };
}

export default function ReceiveScreen() {
  // Get server IP from Context (set by QR scanner on Connect tab)
  const { serverIP } = useServer();
  
  // State for file list received from server
  const [files, setFiles] = useState<FileDict>({});
  
  // Loading state while fetch request is in progress
  const [loading, setLoading] = useState(false);
  
  // Error message if fetch fails
  const [error, setError] = useState<string | null>(null);
  
  // Timestamp of last successful fetch
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  /**
   * Fetch file list from server using HTTP GET request
   * 
   * Constructs URL from scanned server IP and makes GET request to /files endpoint.
   * Server responds with JSON containing array of file objects.
   * 
   * Example:
   * GET http://192.168.1.100:3001/files
   * Response: {
   *   "files": [
   *     {"name": "photo.jpg", "size": 2048576, "type": "image/jpeg", "uploadedAt": "2026-02-20T10:30:00Z"}
   *   ],
   *   "count": 1
   * }
   */
  const fetchFiles = async () => {
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
        ? `${baseURL}/files`
        : `http://${baseURL}:3001/download-model-to-mobile`;
      
      // Make GET request to server (no body needed for GET)
      const response = await fetch(fetchURL);
      
      // Check HTTP status code (200-299 = success)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Parse JSON response from server
      const data: FilesResponse = await response.json();
      
      // Transform array into nested dictionary
      const dict: FileDict = {};
      for (const file of data.files) {
        const dataset = file.datasetName ?? 'Unknown';
        if (!dict[dataset]) dict[dataset] = {};
        const { name, datasetName, ...fields } = file;
        dict[dataset][name] = fields;
      }

      setFiles(dict);
      setLastFetch(new Date().toLocaleTimeString());

      // setDesktopVideoList(dict); // Example of using file list to set desktop video list
      console.log('Fetch complete. Files received:', dict);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  return (
    <ThemedView style={styles.container}>
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
          onTouchEnd={serverIP ? fetchFiles : undefined}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Loading...' : 'Fetch Files'}
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
          <RefreshControl refreshing={loading} onRefresh={fetchFiles} />
        }
      >
        {loading && Object.keys(files).length === 0 ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : Object.keys(files).length === 0 ? (
          <ThemedText style={styles.emptyText}>No files yet. Tap "Fetch Files" to load.</ThemedText>
        ) : (
          Object.entries(files).map(([datasetName, fileMap]) => (
            <ThemedView key={datasetName}>
              <ThemedText style={styles.fileName}>{datasetName}</ThemedText>
              {Object.entries(fileMap).map(([fileName, fields]) => (
                <ThemedView key={fileName} style={styles.fileItem}>
                  <ThemedText style={styles.fileName}>{fileName}</ThemedText>
                  <ThemedText style={styles.fileDetails}>
                    {formatFileSize(fields.size)} • {fields.type}
                  </ThemedText>
                  <ThemedText style={styles.fileDate}>
                    {new Date(fields.uploadedAt).toLocaleString()}
                  </ThemedText>
                </ThemedView>
              ))}
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
    marginTop: 60,
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
});
