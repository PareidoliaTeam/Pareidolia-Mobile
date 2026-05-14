/*
 * Author: Armando Vega
 * Date Created: 2026 January 15
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 2026 March 13
 * 
 * Description : Holds the camera recording screen to allow users to take videos for particular
 * datasets. The chosen video is then stored in the app's async storage and the phone's Documents
 * directory. The user can then view their recorded videos in the video library associated with that
 * dataset. The screen also displays the currently selected dataset profile and the server connection status.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useServer } from '@/contexts/ServerContext';
import { addProfileVideo, getSelectedDatasetProfile } from '@/hooks/useVideoStorage';

export default function CameraScreen() {
    const router = useRouter();
    const {serverIP} = useServer(); // Access server IP from context
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [prediction, setPrediction] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<string | null>(null);
    const navigation = useNavigation();
    
    // Set up header button to navigate to QR Scanner
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

    // Fetch selected profile on mount and when screen is focused
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            (async () => {
                const selected = await getSelectedDatasetProfile();
                if (isActive) setProfile(selected);
            })();
            return () => {
                isActive = false;
            };
        }, [])
    );

    // Request camera permissions on mount
    useEffect(() => {
        (async () => {
            await ImagePicker.requestCameraPermissionsAsync();
        })();
    }, []);

    /**
     * Function to handle taking a photo
     * @deprecated
     */
    const takePhoto = async () => {
        if (!profile) return; // Don't proceed if no profile selected
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setMediaUri(result.assets[0].uri);
            setMediaType('image');
            setPrediction(null);
            // await classifyImage(result.assets[0].uri);
        }
    };

    /**
     * @description Function to handle recording a video. The recorded video is saved to 
     * the app's async storage and the phone's Documents directory. The video is also 
     * associated with the currently selected dataset profile.
     * @params none
     * @returns {Promise<void>}
     */
    const takeVideo = async () => {
        if (!profile) return; // Don't proceed if no profile selected
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 1,
            videoMaxDuration: 60,
        });

        if (!result.canceled) {
            console.log('\nSAVED: ', result.assets[0].uri);
            setMediaUri(result.assets[0].uri);
            setMediaType('video');
            if (profile) {
                await addProfileVideo(profile, result.assets[0].uri);
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.container}>

            <View style={styles.headerCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="images-outline" size={28} color="#8FD49D" />
                    <Text style={styles.profileText} numberOfLines={1}>{profile ?? 'No Profile Selected'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="server-outline" size={20} color="#8FD49D" />
                    <Text style={styles.infoText}>Server: {serverIP ?? 'Not Connected'}</Text>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                {/* <TouchableOpacity style={[styles.actionButton, !profile && styles.buttonDisabled]} onPress={takePhoto} disabled={!profile}>
                    <Ionicons name="camera-outline" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Take Photo</Text>
                </TouchableOpacity> */}

                <TouchableOpacity style={[styles.actionButton, !profile && styles.buttonDisabled]} onPress={takeVideo} disabled={!profile}>
                    <Ionicons name="videocam-outline" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Record Video</Text>
                </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator size="large" color="#8FD49D" style={styles.loader} />}

            {mediaUri && (
                <View style={styles.previewContainer}>
                    {mediaType === 'image' ? (
                        <>
                            <Image source={{ uri: mediaUri }} style={styles.preview} />
                            {prediction && (
                                <Text style={styles.predictionText}>{prediction}</Text>
                            )}
                        </>
                    ) : (
                        <Text style={styles.videoText}>Video recorded: {mediaUri}</Text>
                    )}
                </View>
            )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1, 
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    headerCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 340,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#333',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        gap: 12,
    },
    profileText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        flexShrink: 1,
    },
    infoText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
        flexShrink: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        width: '100%',
        maxWidth: 340,
    },
    actionButton: {
        backgroundColor: '#8FD49D',
        flex: 1,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonDisabled: {
        backgroundColor: '#3A3A3C',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    previewContainer: {
        marginTop: 32,
        width: '100%',
        alignItems: 'center',
    },
    preview: {
        width: 300,
        height: 300,
        borderRadius: 12,
    },
    videoText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    loader: {
        marginTop: 20,
    },
    predictionText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8FD49D',
        marginTop: 16,
        textAlign: 'center',
    },
});