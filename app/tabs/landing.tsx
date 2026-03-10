import { useNavigation, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLayoutEffect } from "react";
import { Ionicons } from '@expo/vector-icons';

export default function LandingScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.logo}>🚀</Text>
        <Text style={styles.appName}>Welcome</Text>
        <Text style={styles.tagline}>Your journey starts here</Text>
      </View>

      <View style={styles.featuresSection}>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>⚡</Text>
          <Text style={styles.featureTitle}>Fast & Reliable</Text>
          <Text style={styles.featureDescription}>
            Lightning-fast performance with reliable service you can trust
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🔒</Text>
          <Text style={styles.featureTitle}>Secure</Text>
          <Text style={styles.featureDescription}>
            Your data is protected with industry-leading security
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>✨</Text>
          <Text style={styles.featureTitle}>Easy to Use</Text>
          <Text style={styles.featureDescription}>
            Intuitive interface designed for the best user experience
          </Text>
        </View>
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
  },
  featuresSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  featureCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaSection: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#8FD49D',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8FD49D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8FD49D',
  },
  secondaryButtonText: {
    color: '#8FD49D',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
