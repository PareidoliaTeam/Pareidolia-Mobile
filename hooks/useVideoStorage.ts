import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths, Directory } from 'expo-file-system/next';

const PROFILE_KEY = 'selectedProfile';
const VIDEOS_KEY = 'profileVideos';
const PROFILES_LIST_KEY = 'profilesList';
const IP_KEY = 'serverIP';
const DESKTOP_VIDEO_LIST_KEY = 'desktopVideoList';

type FileFields = {
  size: number;
  type: string;
  uploadedAt: string;
};

// sacred hall of legends
type FileDict = {
  [datasetName: string]: {
    [fileName: string]: FileFields;
  };
};

export const setDesktopVideoList = async (data: FileDict) => {
  await AsyncStorage.setItem(DESKTOP_VIDEO_LIST_KEY, JSON.stringify(data));
};

export const getDesktopVideoList = async (): Promise<FileDict> => {
  const json = await AsyncStorage.getItem(DESKTOP_VIDEO_LIST_KEY);
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

    const dest = new File(Paths.document, fileName);
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

export const clearTmpFiles = () => {
    try {
        const tmpDir = new Directory(Paths.cache.uri.replace(/\/Library\/Caches\/?$/, '/tmp'));
        if (tmpDir.exists) {
            for (const item of tmpDir.list()) {
                try {
                    if (item instanceof File) {
                        const name = item.uri.split('/').pop() || '';
                        if (name.endsWith('.MOV') || name.endsWith('.mov') || 
                            name.endsWith('.mp4') || name.endsWith('.largeThumbnail')) {
                            console.log(`Deleting tmp file: ${name} (${item.size} bytes)`);
                            item.delete();
                        }
                    }
                } catch (e) {
                    // skip items that can't be deleted
                }
            }
        }
    } catch (e) {
        console.warn('Failed to clear tmp files:', e);
    }
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
  return json ? JSON.parse(json) : ['Model 1', 'Model 2'];
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

    // 1. List all files in Documents
    try {
        const docDir = new Directory(Paths.document);
        if (docDir.exists) {
            const items = docDir.list();
            console.log(`Documents directory (${items.length} items):`);
            for (const item of items) {
                const name = item.uri.split('/').pop() || '';
                if (item instanceof File) {
                    console.log(`  FILE: ${name} (${item.size} bytes)`);
                } else {
                    console.log(`  DIR:  ${name}`);
                }
            }
        }
    } catch (e) {
        console.warn('Failed to list Documents:', e);
    }

    // 2. List all files in Cache
    try {
        const cacheDir = new Directory(Paths.cache);
        if (cacheDir.exists) {
            const items = cacheDir.list();
            console.log(`Cache directory (${items.length} items):`);
            for (const item of items) {
                const name = item.uri.split('/').pop() || '';
                if (item instanceof File) {
                    console.log(`  FILE: ${name} (${item.size} bytes)`);
                } else {
                    console.log(`  DIR:  ${name}`);
                }
            }
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
                const name = item.uri.split('/').pop() || '';
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
                const name = item.uri.split('/').pop() || '';
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