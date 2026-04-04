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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

            <Text style={styles.title}> Selected Profile: {profile ?? 'None'} </Text>
            
            <Text style={styles.modelStatus}>Server IP: {serverIP ?? 'Not Connected'}</Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={takePhoto}>
                    <Text style={styles.buttonText}> Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={takeVideo}>
                    <Text style={styles.buttonText}> Record Video</Text>
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
        justifyContent: 'center',  
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 40,
        color: '#fff',
    },
    modelStatus: {
        color: '#8FD49D',
        fontSize: 14,
        marginBottom: 20,
    },
    buttonContainer: {
        gap: 16,
        width: '100%',
        maxWidth: 300,
    },
    button: {
        backgroundColor: '#8FD49D',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#8FD49D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
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