import useDatasetTabContent from "@/hooks/datasetTab";
import { addProfile, getProfiles } from "@/hooks/useVideoStorage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setProfiles(await getProfiles());
    })();
  }, []);

  const handleAddProfile = async (name: string) => {
    if (name && name.trim()) {
      await addProfile(name.trim());
      setProfiles(await getProfiles());
    }
  };

  const datasetTabContent =  useDatasetTabContent({
    profiles,
    router,
    handleAddProfile,
  });

  

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.titleContainer}>
        <Text style={styles.header}>Dataset Profiles</Text>
      </View>
      {datasetTabContent}
      

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