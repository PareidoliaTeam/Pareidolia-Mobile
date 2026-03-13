/*
 * Author: Armando Vega
 * Date Created: 2 March 2026
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 13 March 2026
 * 
 * Description: This file defines a custom hook `useDatasetTabContent` 
 * that is the tab that shows the dataset profiles of a user. It allows
 * for setting the current dataset profile and the videos associated 
 * with each profile.
 */
import { clearTmpFiles, logAllAppStorage, logStorageUsage, setSelectedModelProfile, clearTempDocuments, removeModelProfile, setMountedModelInfo } from '@/hooks/useVideoStorage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, Touchable, TouchableOpacity, View } from 'react-native';
import InputModal from './datasetCreationModal';

type Props = {
  profiles: string[];
  router: ReturnType<typeof useRouter>;
  handleAddProfile: (name: string) => void;
  handleRemoveProfile: (name: string) => void;
};

function useModelTabContent({
  profiles: models,
  router,
  handleAddProfile,
  handleRemoveProfile
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  return (
    <>
      <InputModal
        visible={modalVisible}
        title="Add Profile"
        placeholder="Profile name"
        onConfirm={(value) => {
          setModalVisible(false);
          handleAddProfile(value);
        }}
        onCancel={() => setModalVisible(false)}
      />
     
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40, paddingHorizontal: 20}}>
        

        <View style={styles.grid}>
          {models.map(profile => (
            <View key={profile} style={styles.cardContainer}>
              <Text style={styles.smallButtonText}>{profile}</Text>
              <TouchableOpacity
                style={[styles.smallButton, { marginTop: 8, backgroundColor: '#4A90E2' }]}
                onPress={async () => {
                  await setSelectedModelProfile(profile);
                  console.log(`Selected model profile: ${profile}`);
                }}
              >
                <Text style={styles.smallButtonText}>Set Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, { marginTop: 8, backgroundColor: '#8B0000' }]}
                onPress={async () => {
                  await handleRemoveProfile(profile);
                  console.log(`Deleted model profile: ${profile}`);
                }}
              >
                <Text style={styles.smallButtonText}>Delete Profile</Text>
              </TouchableOpacity>
              
            </View>
          ))}
          
          {/* KEEP THIS COMMENTED OUT BLOCK FOR CLOUD SERVICE IMPLEMENTATION */}
          {/* <TouchableOpacity 
            style={[styles.cardContainer, styles.addCard]}
            onPress={() => {
              setModalVisible(true)
              
            }}
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.smallButtonText}>Add Profile</Text>
          </TouchableOpacity> */}
          {/* KEEP THIS COMMENTED OUT BLOCK FOR CLOUD SERVICE IMPLEMENTATION */}

        </View>
      </ScrollView>
    </>
  );
}

export default useModelTabContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  titleContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#000',  // Also change this back from #b62d2d
    paddingTop: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 12,
    width: '48%',
    height: 150,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
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