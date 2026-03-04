import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAsync, downloadAsync, getInfoAsync } from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system/next';

const PROFILE_KEY = 'selectedProfile';
const MODEL_PROFILES_LIST_KEY = 'modelProfilesList';
const VIDEOS_KEY = 'profileVideos';
const PROFILES_LIST_KEY = 'profilesList';
const IP_KEY = 'serverIP';
const DESKTOP_VIDEOS_SENT_KEY = 'desktopVideosSent';

const modelsSubDir = new Directory(Paths.document, 'models');
const videosSubDir = new Directory(Paths.document, 'videos');

if (!videosSubDir.exists) {
  videosSubDir.create();
}
if (!modelsSubDir.exists) {
  modelsSubDir.create();
}

// sacred hall of legends
type FileDict = {
  [datasetName: string]: {
    [fileName: string]: {
        size: number;
        type: string;
        uploadedAt: string;
        }
    };
};

type FetchModelFilesListRes = {
  [modelName: string]: {
    path: string;
  };
}

type FetchLabelsFilesRes = {
  [labelName: string]: {
    path: string;
  };
}

export const downloadModelFile = async (modelName: string, serverIP: string) => {
  const baseURL = serverIP.replace(/\/$/, '');
  const downloadURL = baseURL.startsWith('http') 
    ? `${baseURL}/download-model-to-mobile?modelName=${modelName}`
    : `http://${baseURL}:3001/download-model-to-mobile?modelName=${modelName}`;
  console.log("modelName: ", modelName);
  console.log("serverIP: ", serverIP);
  console.log("downloadURL: ", downloadURL);
  try {
    const dest = new File(new Directory(Paths.document, 'models'), modelName);
    console.log("dest uri: ", dest.uri);
    
    const fileExists = await getInfoAsync(dest.uri + ".tflite");
    if (fileExists.exists) {
      await deleteAsync(dest.uri + ".tflite");
    }

    const { uri, status } = await downloadAsync(downloadURL, dest.uri + ".tflite");
    
    if (status !== 200) {
      throw new Error(`Server returned status ${status}`);
    }

    // Verify file actually saved
    const fileInfo = await getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File failed to save to device');
    }
    if (fileInfo.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    const ext = uri.split('/').pop() || 'unknown';
    console.log('Model saved to:', uri);
    console.log('File extension:', ext);
    console.log('File size:', fileInfo.size, 'bytes');
    return uri;

  } catch (error) {
    console.error('Error downloading model:', error);
    throw error; // re-throw so the caller can handle it
  }
}

export const setModelProfilesList = async (profiles: FetchModelFilesListRes) => {
  await AsyncStorage.setItem(MODEL_PROFILES_LIST_KEY, JSON.stringify(profiles));
}

export const getModelProfilesList = async (): Promise<FetchModelFilesListRes> => {
  const json = await AsyncStorage.getItem(MODEL_PROFILES_LIST_KEY);
  return json ? JSON.parse(json) : {};
}

export const setDesktopVideosSent = async (data: FileDict) => {
  await AsyncStorage.setItem(DESKTOP_VIDEOS_SENT_KEY, JSON.stringify(data));
};

export const getDesktopVideosSent = async (): Promise<FileDict> => {
  const json = await AsyncStorage.getItem(DESKTOP_VIDEOS_SENT_KEY);
  return json ? JSON.parse(json) : {};
};

export const setServerIP = async (ip: string | null) => {
    await AsyncStorage.setItem(IP_KEY, ip || 'No IP Set');
};

export const getServerIP = async (): Promise<string | null> => {
    return await AsyncStorage.getItem(IP_KEY);
};

export const setSelectedProfile = async (profile: string) => {
  await AsyncStorage.setItem(PROFILE_KEY, profile);
};

export const getSelectedProfile = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(PROFILE_KEY);
};

export const getProfileVideos = async (profile: string): Promise<string[]> => {
  const json = await AsyncStorage.getItem(VIDEOS_KEY);
  const all = json ? JSON.parse(json) : {};
  return all[profile] || [];
};

export const addProfileVideo = async (profile: string, uri: string) => {
    console.log("URI BEFORE: ", uri)
    // const fileName = `${formatTimeFileName()}_${uri.split('/').pop()}`;
    const fileName = `${formatTimeFileName()}_${profile.split(' ').join('_')}.mp4`;

    console.log("FILENAME AFTER: ", fileName);

    const dest = new File(new Directory(Paths.document, 'videos'), fileName);
    const source = new File(uri);
    source.copy(dest);

    // Delete the ImagePicker temp file after copying
    try {
        if (source.exists) {
            source.delete();
            console.log('Deleted ImagePicker temp file:', uri);
        } else {
            console.warn('ImagePicker temp file does not exist:', uri);
        }
    } catch (e) {
        console.log('Failed to delete ImagePicker temp file:', e);
    }

    const savedUri = dest.uri;

    const json = await AsyncStorage.getItem(VIDEOS_KEY);
    const all = json ? JSON.parse(json) : {};
    all[profile] = [savedUri, ...(all[profile] || [])];
    await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(all));
    clearTmpFiles(); // Clean up any remaining temp files after adding a new video
};

const deleteMediaRecursive = (dir: Directory, indent: string = '') => {
    try {
        const items = dir.list();
        console.log(`${indent}Scanning: ${dir.uri.replace(/\/$/, '').split('/').pop()} (${items.length} items)`);
        for (const item of items) {
            try {
                if (item instanceof File) {
                    const name = item.uri.replace(/\/$/, '').split('/').pop() || '';
                    if (name.endsWith('.MOV') || name.endsWith('.mov') ||
                        name.endsWith('.mp4') || name.endsWith('.largeThumbnail') ||
                        name.endsWith('.tflite')) {
                        console.log(`${indent}Deleting: ${name} (${item.size} bytes)`);
                        item.delete();
                    } else {
                        console.log(`${indent}Skipping: ${name}`);
                    }
                } else if (item instanceof Directory) {
                    deleteMediaRecursive(item, indent + '  ');
                }
            } catch (e) {
                // skip items that can't be deleted
            }
        }
    } catch (e) {
        console.warn(`${indent}[ERROR scanning dir]: ${e}`);
    }
};

export const clearTmpFiles = () => {
    console.log('=== CLEAR TMP FILES ===');

    try {
        const cacheUri = Paths.cache.uri;
        console.log('Cache URI:', cacheUri);

        // Try both common tmp path patterns
        const tmpPaths = [
            cacheUri.replace(/\/Library\/Caches\/?$/, '/tmp'),
            cacheUri.replace(/\/Caches\/?$/, '/tmp'),
            cacheUri.replace(/\/[^/]+\/?$/, '/tmp'),
        ];

        let found = false;
        for (const tmpPath of tmpPaths) {
            console.log('Trying tmp path:', tmpPath);
            const tmpDir = new Directory(tmpPath);
            if (tmpDir.exists) {
                found = true;
                deleteMediaRecursive(tmpDir);
                break;
            }
        }

        if (!found) {
            console.warn('No tmp directory found at any expected path');
        }
    } catch (e) {
        console.warn('Failed to clear tmp files:', e);
    }

    console.log('=== END CLEAR TMP FILES ===');
};

export const clearTempDocuments = () => {
    console.log('=== CLEAR TEMP DOCUMENTS ===');
    try {
        const docDir = new Directory(Paths.document);
        if (docDir.exists) {
            console.log('Scanning Documents for stray media files...');
            deleteMediaRecursive(docDir);
        }
    } catch (e) {
        console.warn('Failed to scan Documents:', e);
    }
    console.log('=== END CLEAR TEMP DOCUMENTS ===');
};

export const removeProfileVideo = async (profile: string, uri: string) => {
    const json = await AsyncStorage.getItem(VIDEOS_KEY);
    const all = json ? JSON.parse(json) : {};
    all[profile] = (all[profile] || []).filter((v: string) => v !== uri);
    await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(all));

    try {
        const file = new File(uri);
        console.log(`File URI: ${uri}`);
        console.log(`File exists: ${file.exists}`);
        if (file.exists) {
            file.delete();
            if(file.exists) {
                console.warn(`File still exists after deletion attempt: ${uri}`);
            } else {
                console.log(`File deleted successfully: ${uri}`);
            }
            console.log(`Deleted video file successfully`);
        } else {
            console.warn(`File does not exist at: ${uri}`);
        }
    } catch (error) {
        console.warn('Failed to delete video file:', error);
    }
};

export const getProfiles = async (): Promise<string[]> => {
  const json = await AsyncStorage.getItem(PROFILES_LIST_KEY);
  return json ? JSON.parse(json) : ['Apples', 'Oranges', 'Bananas'];
};

function formatTimeFileName(){
    const now = new Date();
    const months = {
        "1": "jan",
        "2": "feb",
        "3": "mar",
        "4": "apr",
        "5": "may",
        "6": "jun",
        "7": "jul",
        "8": "aug",
        "9": "sep",
        "10": "oct",
        "11": "nov",
        "12": "dec"
    };

    return [
        String(now.getFullYear()),
        months[String(now.getMonth() + 1) as keyof typeof months],
        String(now.getDay()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
        "user"
    ].join('-');
}

export const addProfile = async (name: string) => {
  const profiles = await getProfiles();
  if (!profiles.includes(name)) {
    profiles.push(name);
    await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
  }
};

export const removeProfile = async (name: string) => {
  const profiles = await getProfiles();
  const filtered = profiles.filter(p => p !== name);
  await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(filtered));
};

export const clearImagPickerCache = async () => {
    try {
        const imagePickerCache = new Directory(Paths.cache, 'ImagePicker');
        if (imagePickerCache.exists) {
            imagePickerCache.delete();
            console.log('Cleared ImagePicker cache');
        }
    } catch (e) {
        console.warn('Failed to clear ImagePicker cache:', e);
    }
};

export const logStorageUsage = async () => {
    console.log('=== STORAGE DIAGNOSTIC ===');

    const listWithSubdirs = (dir: Directory, indent: string = '') => {
        try {
            if (!dir.exists) return;
            for (const item of dir.list()) {
                const name = item.uri.replace(/\/$/, '').split('/').pop() || '';
                if (item instanceof File) {
                    console.log(`${indent}FILE: ${name} (${item.size} bytes)`);
                } else if (item instanceof Directory) {
                    console.log(`${indent}DIR:  ${name}/`);
                    listWithSubdirs(item, indent + '  ');
                }
            }
        } catch (e) {
            console.warn(`${indent}[ERROR reading dir]: ${e}`);
        }
    };

    // 1. List all files in Documents
    try {
        const docDir = new Directory(Paths.document);
        if (docDir.exists) {
            console.log(`Documents directory (${docDir.list().length} items):`);
            listWithSubdirs(docDir, '  ');
        }
    } catch (e) {
        console.warn('Failed to list Documents:', e);
    }

    // 2. List all files in Cache
    try {
        const cacheDir = new Directory(Paths.cache);
        if (cacheDir.exists) {
            console.log(`Cache directory (${cacheDir.list().length} items):`);
            listWithSubdirs(cacheDir, '  ');
        }
    } catch (e) {
        console.warn('Failed to list Cache:', e);
    }

    // 3. Show what AsyncStorage still references
    const json = await AsyncStorage.getItem(VIDEOS_KEY);
    console.log('AsyncStorage video references:', json);

    console.log('=== END DIAGNOSTIC ===');
};

export const logAllAppStorage = async () => {
    console.log('=== FULL APP STORAGE DIAGNOSTIC ===');

    const listRecursive = (dir: Directory, indent: string = '') => {
        try {
            if (!dir.exists) return;
            for (const item of dir.list()) {
                const name = item.uri.replace(/\/$/, '').split('/').pop() || '';
                if (item instanceof File) {
                    console.log(`${indent}FILE: ${name} (${item.size} bytes)`);
                } else if (item instanceof Directory) {
                    console.log(`${indent}DIR:  ${name}/`);
                    listRecursive(item, indent + '  ');
                }
            }
        } catch (e) {
            console.warn(`${indent}[ERROR reading dir]: ${e}`);
        }
    };

    // Documents
    console.log('📁 DOCUMENTS:');
    listRecursive(new Directory(Paths.document));

    // Cache
    console.log('📁 CACHE:');
    listRecursive(new Directory(Paths.cache));

    // App support / Library (one level up from Documents)
    try {
        const documentsUri = Paths.document.uri || String(Paths.document);
        // Go up from Documents to the app container
        const appContainerPath = documentsUri.replace(/\/Documents\/?$/, '');
        console.log('📁 APP CONTAINER:');
        const appContainer = new Directory(appContainerPath);
        if (appContainer.exists) {
            for (const item of appContainer.list()) {
                const name = item.uri.replace(/\/$/, '').split('/').pop() || '';
                if (item instanceof Directory) {
                    console.log(`  DIR:  ${name}/`);
                    listRecursive(item, '    ');
                } else if (item instanceof File) {
                    console.log(`  FILE: ${name} (${item.size} bytes)`);
                }
            }
        }
    } catch (e) {
        console.warn('Could not read app container:', e);
    }

    // Total sizes
    const calcSize = (dir: Directory): number => {
        let total = 0;
        try {
            if (!dir.exists) return 0;
            for (const item of dir.list()) {
                if (item instanceof File) {
                    total += item.size || 0;
                } else if (item instanceof Directory) {
                    total += calcSize(item);
                }
            }
        } catch (e) {}
        return total;
    };

    const docSize = calcSize(new Directory(Paths.document));
    const cacheSize = calcSize(new Directory(Paths.cache));
    console.log(`\nTOTAL Documents: ${(docSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`TOTAL Cache: ${(cacheSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`TOTAL: ${((docSize + cacheSize) / 1024 / 1024).toFixed(2)} MB`);

    console.log('=== END FULL DIAGNOSTIC ===');
};