import { addProfile, clearTmpFiles, getProfiles, logAllAppStorage, logStorageUsage, setSelectedProfile } from "@/hooks/useVideoStorage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setProfiles(await getProfiles());
    })();
  }, []);

  const handleAddProfile = () => {
    Alert.prompt(
      "New Profile",
      "Enter profile name:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Add",
          onPress: async (name?: string) => {
            if (name && name.trim()) {
              await addProfile(name.trim());
              setProfiles(await getProfiles());
            }
          }
        }
      ],
      "plain-text"
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.titleContainer}>
        <Text style={styles.header}>Model Profiles</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40, paddingHorizontal: 20}}>
        <TouchableOpacity
          style={[styles.smallButton, { alignSelf: 'center', marginBottom: 20 }]}
          onPress={async () => {
            await logStorageUsage();
          }}
        >
          <Text style={styles.smallButtonText}>Show Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { alignSelf: 'center', marginBottom: 20 }]}
          onPress={async () => {
            await logAllAppStorage();
          }}
        >
          <Text style={styles.smallButtonText}>Show All App Storage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { alignSelf: 'center', marginBottom: 20, backgroundColor: '#8B0000' }]}
          onPress={async () => {
            await clearTmpFiles();
          }}
        >
          <Text style={styles.smallButtonText}>Clear Tmp Files</Text>
        </TouchableOpacity>

        <View style={styles.grid}>
            {profiles.map(profile => (
            <View key={profile} style={styles.cardContainer}>
              <Text style={styles.smallButtonText}>{profile}</Text>
              <TouchableOpacity
                style={[styles.smallButton, { marginTop: 8, backgroundColor: '#4A90E2' }]}
                onPress={async () => {
                  await setSelectedProfile(profile);
                  // Optionally show feedback
                  console.log(`Selected profile: ${profile}`);
                }}
              >
                <Text style={styles.smallButtonText}>Set Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, { marginTop: 6 }]} 
                onPress={() => router.push({ pathname: '/profileVideos', params: { profile } })}
              >
                <Text style={styles.smallButtonText}>View Videos</Text>
              </TouchableOpacity>
            </View>
            ))}
            
            <TouchableOpacity 
              style={[styles.cardContainer, styles.addCard]}
              onPress={handleAddProfile}
            >
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.smallButtonText}>Add Profile</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
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
    paddingTop: 10,
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
    marginBottom: 40,
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