/*
 * Author: Armando Vega
 * Date Created: 2026 January 15
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 2026 March 13
 * 
 * Description : Lists all dataset and model profiles stored in the app. The user can swap between dataset and model profile views using
 * tabs at the top. Users can set their selected profile for both datasets and models by clicking on the profile card, which will then be 
 * used in the camera and classify tabs. Profiles can also be deleted from this screen. This screen also includes some admin tools for debugging, 
 * such as logging storage usage and clearing temporary files.
 */

import useDatasetTabContent from "@/hooks/datasetTab";
import useModelTabContent from "@/hooks/modelTab";
import { addDatasetProfile, addModelProfile, clearTempDocuments, clearTmpFiles, getDatasetProfiles, getModelProfiles, logAllAppStorage, logStorageUsage, removeDatasetProfile, removeModelProfile } from "@/hooks/useVideoStorage";
import { useFocusEffect, useRouter, useNavigation } from "expo-router";
import { useCallback, useState, useLayoutEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons'; // For icons in the header

export default function Index() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'dataset' | 'model'>('dataset');
  const navigation = useNavigation();

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

  // determines which display to show
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setProfiles(selectedTab === 'dataset' ? await getDatasetProfiles() : await getModelProfiles());
      })();
    }, [selectedTab])
  );

  /**
   * @description handles the adding of profiles depending on if it's a dataset or a model profile
   * @param name 
   */
  const handleAddProfile = async (name: string) => { 
    if (name && name.trim()) {
      if (selectedTab === 'dataset') {
        await addDatasetProfile(name.trim());
      } else {
        await addModelProfile(name.trim());
      }
      setProfiles(selectedTab === 'dataset' ? await getDatasetProfiles() : await getModelProfiles());
    }
  };

  /**
   * @description handles the removal of profiles depending on if it's a dataset or a model profile
   * @param name
   */
  const handleRemoveProfile = async (name: string) => {
    if (name && name.trim()) {
      if (selectedTab === 'dataset') {
        await removeDatasetProfile(name.trim());
      } else {
        await removeModelProfile(name.trim());
      }
      setProfiles(selectedTab === 'dataset' ? await getDatasetProfiles() : await getModelProfiles());
    }
  };

  const datasetTabContent =  useDatasetTabContent({
    profiles,
    router,
    handleAddProfile,
    handleRemoveProfile
  });

  const modelTabContent = useModelTabContent({
    profiles,
    router,
    handleAddProfile,
    handleRemoveProfile
  });

  

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* --------- admin tools start -----------*/}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={async () => {
            await logStorageUsage();  
          }}
        >
          <Text style={styles.smallButtonText}>Show Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={async () => {
            await logAllAppStorage();
          }}
        >
          <Text style={styles.smallButtonText}>Show All App Storage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#8B0000' }]}
          onPress={async () => {
            await clearTmpFiles();
          }}
        >
          <Text style={styles.smallButtonText}>Clear Tmp Files</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#8B0000' }]}
          onPress={async () => {
            await clearTempDocuments();
          }}
        >
          <Text style={styles.smallButtonText}>Clear Document Files</Text>
        </TouchableOpacity>
      </View>
      {/* --------- admin tools end -----------*/}

      <View style={styles.tabBar}>
        {(['dataset', 'model'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab === 'dataset' ? 'Datasets' : 'Models'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>
        <View style={styles.titleContainer}>
                <Text style={styles.header}>{selectedTab === 'dataset' ? 'Dataset Profiles' : 'Model Profiles'}</Text>
          </View>
        {selectedTab === 'dataset' ? datasetTabContent : modelTabContent}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: -20,
    marginBottom: 4,
  },
  tabBar: {
  flexDirection: 'row',
  paddingHorizontal: 16,
  paddingTop: 0,
  alignItems: 'flex-end',   // inactive tabs sit lower
  justifyContent: 'center',
  gap: 8
},
tab: {
  paddingVertical: 12,
  paddingHorizontal: 20,
  marginRight: 4,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  backgroundColor: '#2C2C2E',
  borderWidth: 1,
  borderBottomWidth: 0,
  borderColor: '#444',
  marginTop: 4,             // inactive sits lower
},
activeTab: {
  backgroundColor: '#1C1C1E', // match content background
  marginTop: 0,             // active sits flush at top
  borderColor: '#666',
},
tabText: { color: '#888', fontSize: 14, fontWeight: '500' },
activeTabText: { color: '#fff' },
tabContent: {
  flex: 1,
  backgroundColor: '#1C1C1E',
  borderTopWidth: 1,
  borderColor: '#666',
},
  cardContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#1C1C1E',
  padding: 20,
  borderRadius: 12,
  width: '48%',  // 2 columns with 4% gap
  height: 150,   // Fixed height for square-ish shape
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#333',
},
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  titleContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#000',  // Also change this back from #b62d2d
    paddingTop: 20,
  },
  smallButton: {
    backgroundColor: '#8FD49D',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    minWidth: 90,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
    header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  width: '100%',
},
  addCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#8FD49D',
    backgroundColor: 'transparent',
  },
  addIcon: {
    fontSize: 48,
    color: '#8FD49D',
    fontWeight: '300',
  },
});