// ============================================
// Kaarigar — Smart Camera Screen
// Guided product photography with:
// - Lighting detection
// - Gyroscope level (bubble indicator)
// - Shake detection (stability check)
// - Multi-angle prompts
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

// Conditional imports for native-only modules
let CameraView: any = null;
let useCameraPermissions: any = null;
let DeviceMotion: any = null;
let Haptics: any = null;

// Only import native modules on device (not web)
if (Platform.OS !== 'web') {
  try {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    useCameraPermissions = cameraModule.useCameraPermissions;
  } catch (e) {}
  try {
    DeviceMotion = require('expo-sensors').DeviceMotion;
  } catch (e) {}
  try {
    Haptics = require('expo-haptics');
  } catch (e) {}
}

type LightCondition = 'good' | 'low' | 'too_bright';
type Readiness = { light: LightCondition; level: boolean; steady: boolean };

const PHOTO_ANGLES = ['front', 'back', 'detail'] as const;
const MAX_PHOTOS = 3;

export default function CameraScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [readiness, setReadiness] = useState<Readiness>({
    light: 'good',
    level: false,
    steady: false,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // ─── Request camera permission ─────────────

  useEffect(() => {
    if (Platform.OS === 'web') {
      setHasPermission(false); // Camera not available on web preview
      return;
    }

    (async () => {
      if (useCameraPermissions) {
        // Use expo-camera's hook outside of conditional
        // For simplicity, request directly
        const { Camera } = require('expo-camera');
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    })();
  }, []);

  // ─── Gyroscope & Shake Detection ───────────

  useEffect(() => {
    if (Platform.OS === 'web' || !DeviceMotion) return;

    let shakeBuffer: number[] = [];

    DeviceMotion.setUpdateInterval(100); // 10Hz for battery efficiency

    const subscription = DeviceMotion.addListener((data: any) => {
      const { rotation, acceleration } = data;

      // Level detection
      const beta = Math.abs(rotation?.beta ?? 0);
      const gamma = Math.abs(rotation?.gamma ?? 0);
      const isLevel = beta < 0.15 && gamma < 0.15;

      // Shake detection
      if (acceleration) {
        const magnitude = Math.sqrt(
          (acceleration.x ?? 0) ** 2 +
          (acceleration.y ?? 0) ** 2 +
          (acceleration.z ?? 0) ** 2
        );
        shakeBuffer.push(magnitude);
        if (shakeBuffer.length > 10) shakeBuffer.shift();

        const avg = shakeBuffer.reduce((a: number, b: number) => a + b, 0) / shakeBuffer.length;
        const variance = shakeBuffer.reduce((a: number, b: number) => a + (b - avg) ** 2, 0) / shakeBuffer.length;
        const isSteady = variance < 0.3;

        setReadiness((prev) => ({
          ...prev,
          level: isLevel,
          steady: isSteady,
        }));
      }
    });

    return () => subscription.remove();
  }, []);

  // ─── Capture Photo ─────────────────────────

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (photo?.uri) {
        const filename = `product_${Date.now()}_${PHOTO_ANGLES[currentAngle]}.jpg`;
        const baseDir = (FileSystem as any).documentDirectory || '';
        const localPath = `${baseDir}photos/${filename}`;

        await FileSystem.makeDirectoryAsync(
          `${baseDir}photos/`,
          { intermediates: true }
        ).catch(() => {});

        await FileSystem.moveAsync({ from: photo.uri, to: localPath });

        if (Haptics) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const newPhotos = [...photos, localPath];
        setPhotos(newPhotos);

        if (newPhotos.length < MAX_PHOTOS) {
          setCurrentAngle(newPhotos.length);
        } else {
          router.push('/create/voice');
        }
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      if (Haptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [cameraRef, isCapturing, photos, currentAngle, router]);

  const allClear = readiness.light === 'good' && readiness.level && readiness.steady;

  // ─── Web / No Camera Fallback ──────────────

  if (Platform.OS === 'web' || hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}></Text>
        <Text style={styles.permissionText}>
          {Platform.OS === 'web'
            ? 'Camera is only available on your phone.\nOpen this app on your device to use the camera.'
            : t('camera.title')}
        </Text>
        {/* Skip to voice on web for testing */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.push('/create/voice')}
        >
          <Text style={styles.skipButtonText}>Skip to Voice Recording </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipButton, { backgroundColor: Colors.textLight, marginTop: Spacing.md }]}
          onPress={() => router.back()}
        >
          <Text style={styles.skipButtonText}> Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  // ─── Camera UI ─────────────────────────────

  return (
    <View style={styles.container}>
      {CameraView ? (
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Grid overlay */}
          <View style={styles.gridOverlay}>
            <View style={[styles.gridLine, styles.gridLineH1]} />
            <View style={[styles.gridLine, styles.gridLineH2]} />
            <View style={[styles.gridLine, styles.gridLineV1]} />
            <View style={[styles.gridLine, styles.gridLineV2]} />
            <View style={styles.centerCross}>
              <Text style={styles.centerCrossText}>+</Text>
            </View>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusBar}>
            <View style={[styles.indicator, readiness.light === 'good' ? styles.indicatorGood : styles.indicatorBad]}>
              <View style={styles.indicatorIcon}>
                {readiness.light === 'good' ? <Feather name="sun" size={16} color="#000" /> : <Feather name="moon" size={16} color="#fff" />}
              </View>
              <Text style={styles.indicatorText}>
                {readiness.light === 'good' ? 'Good' : 'Low'}
              </Text>
            </View>

            <View style={[styles.indicator, readiness.level ? styles.indicatorGood : styles.indicatorBad]}>
              <View style={styles.indicatorIcon}>
                {readiness.level ? <Feather name="check-circle" size={16} color="#000" /> : <Feather name="alert-circle" size={16} color="#fff" />}
              </View>
              <Text style={styles.indicatorText}>
                {readiness.level ? 'Level' : 'Tilt'}
              </Text>
            </View>

            <View style={[styles.indicator, readiness.steady ? styles.indicatorGood : styles.indicatorBad]}>
              <View style={styles.indicatorIcon}>
                {readiness.steady ? <Feather name="anchor" size={16} color="#000" /> : <Feather name="activity" size={16} color="#fff" />}
              </View>
              <Text style={styles.indicatorText}>
                {readiness.steady ? 'Steady' : 'Shaking'}
              </Text>
            </View>
          </View>

          {/* Angle prompt */}
          <View style={styles.anglePrompt}>
            <Text style={styles.angleText}>
               <Feather name="camera" size={16} color="#fff" /> {currentAngle === 0 ? 'Front View' : currentAngle === 1 ? 'Back View' : 'Detail / Close-up'}
            </Text>
            <Text style={styles.photoCount}>
              Photo {photos.length + 1} of {MAX_PHOTOS}
            </Text>
          </View>
        </CameraView>
      ) : (
        <View style={[styles.camera, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
          <Feather name="camera-off" size={48} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, marginTop: 8 }}>Camera loading...</Text>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}> Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.captureButton,
            allClear && styles.captureButtonReady,
            isCapturing && styles.captureButtonCapturing,
          ]}
          onPress={capturePhoto}
          disabled={isCapturing}
          activeOpacity={0.7}
        >
          <View style={styles.captureButtonInner}>
            {isCapturing ? <Feather name="clock" size={32} color="#000" /> : <Feather name="camera" size={32} color="#000" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            if (photos.length > 0) {
              router.push('/create/voice');
            }
          }}
          disabled={photos.length === 0}
        >
          <Text style={[styles.secondaryButtonText, photos.length === 0 && { opacity: 0.3 }]}>
            Next 
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, padding: Spacing.xxxl,
  },
  permissionIcon: { fontSize: 72, marginBottom: Spacing.xl },
  permissionText: {
    fontSize: Typography.sizes.lg, color: Colors.text,
    textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 28,
  },
  skipButton: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, width: '100%', alignItems: 'center',
  },
  skipButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  gridOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.25)' },
  gridLineH1: { left: 0, right: 0, top: '33.33%', height: 1 },
  gridLineH2: { left: 0, right: 0, top: '66.66%', height: 1 },
  gridLineV1: { top: 0, bottom: 0, left: '33.33%', width: 1 },
  gridLineV2: { top: 0, bottom: 0, left: '66.66%', width: 1 },
  centerCross: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -15, marginLeft: -15, width: 30, height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCrossText: { color: 'rgba(255,255,255,0.5)', fontSize: 28, fontWeight: '200' },
  statusBar: {
    position: 'absolute', top: 60, left: Spacing.md, right: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm,
  },
  indicator: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm, gap: 4,
  },
  indicatorGood: { backgroundColor: 'rgba(46, 125, 50, 0.85)' },
  indicatorBad: { backgroundColor: 'rgba(198, 40, 40, 0.7)' },
  indicatorIcon: { alignItems: 'center', justifyContent: 'center' },
  indicatorText: { color: '#fff', fontSize: 11, fontWeight: Typography.weights.medium },
  anglePrompt: { position: 'absolute', bottom: 20, left: Spacing.xl, right: Spacing.xl, alignItems: 'center' },
  angleText: {
    color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold,
    textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
  },
  photoCount: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.sizes.sm, marginTop: Spacing.xs },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, backgroundColor: '#000',
  },
  captureButton: {
    width: TouchTargets.voiceButton, height: TouchTargets.voiceButton,
    borderRadius: TouchTargets.voiceButton / 2, backgroundColor: '#333',
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff',
  },
  captureButtonReady: { backgroundColor: Colors.primary, borderColor: Colors.secondary },
  captureButtonCapturing: { opacity: 0.5 },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  captureButtonText: { fontSize: 32 },
  secondaryButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  secondaryButtonText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
});
