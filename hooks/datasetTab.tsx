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
import { setSelectedDatasetProfile } from '@/hooks/useVideoStorage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import InputModal from './datasetCreationModal';

type Props = {
  profiles: string[];
  router: ReturnType<typeof useRouter>;
  handleAddProfile: (name: string) => void;
  handleRemoveProfile: (name: string) => void;
};

function useDatasetTabContent({
  profiles: datasets,
  router,
  handleAddProfile,
  handleRemoveProfile
}: Props) {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSetActive = async (profile: string) => {
    await setSelectedDatasetProfile(profile);
    setActiveProfile(profile);
    console.log(`Selected dataset profile: ${profile}`);
  };

  const showAddPrompt = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add Profile',
        'Enter a profile name',
        (name) => { if (name && name.trim()) handleAddProfile(name.trim()); },
        'plain-text'
      );
    } else {
      setModalVisible(true);
    }
  };

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
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, paddingTop: 12 }}>
        {datasets.map(profile => (
          <TouchableOpacity
            key={profile}
            style={[styles.card, activeProfile === profile && styles.cardActive]}
            onPress={() => handleSetActive(profile)}
            activeOpacity={0.75}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.activeDot, activeProfile === profile && styles.activeDotOn]} />
              <Text style={styles.profileName} numberOfLines={2}>{profile}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => router.push({ pathname: '/tabs/profileVideos', params: { profile } })}
            >
              <Text style={styles.viewButtonText}>Videos</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={showAddPrompt}>
          <Text style={styles.addButtonText}>+ Add Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

export default useDatasetTabContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardActive: {
    borderColor: '#8FD49D',
    backgroundColor: '#1a2b1e',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#444',
  },
  activeDotOn: {
    backgroundColor: '#8FD49D',
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewButtonText: {
    color: '#8FD49D',
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#8FD49D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: {
    color: '#8FD49D',
    fontSize: 15,
    fontWeight: '600',
  },
});

