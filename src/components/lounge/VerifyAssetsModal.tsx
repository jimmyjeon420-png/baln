import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { requestVerification } from '../../services/verificationService';
import { useLocale } from '../../context/LocaleContext';

interface VerifyAssetsModalProps {
  visible: boolean;
  onClose: () => void;
  totalAssets: number;
  onVerified: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface VerificationResult {
  success: boolean;
  diffPercent?: number;
}

export default function VerifyAssetsModal({
  visible,
  onClose,
  totalAssets,
  onVerified,
}: VerifyAssetsModalProps) {
  const { t } = useLocale();
  const [step, setStep] = useState<Step>(1);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const resetState = () => {
    setStep(1);
    setSelectedImageUri(null);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return;
    }

    const uri = pickerResult.assets[0].uri;
    setSelectedImageUri(uri);
    setStep(2);
  };

  const handleVerify = async () => {
    if (!selectedImageUri) return;

    setStep(3);

    try {
      const base64 = await FileSystem.readAsStringAsync(selectedImageUri, {
        encoding: 'base64',
      });

      const response = await requestVerification(base64, 'image/jpeg', totalAssets);

      setResult({
        success: response.success,
        diffPercent: response.diffPercent,
      });
      setStep(4);

      if (response.success) {
        onVerified();
      }
    } catch (_error) {
      setResult({ success: false, diffPercent: undefined });
      setStep(4);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>📸</Text>
      </View>
      <Text style={styles.title}>{t('verifyAssets.title')}</Text>
      <Text style={styles.description}>
        {t('verifyAssets.description')}
      </Text>
      <Text style={styles.subdescription}>
        {t('verifyAssets.subdescription')}
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handlePickImage}>
        <Text style={styles.primaryButtonText}>{t('verifyAssets.pickPhoto')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
        <Text style={styles.secondaryButtonText}>{t('common.close')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {selectedImageUri && (
        <Image source={{ uri: selectedImageUri }} style={styles.previewImage} contentFit="contain" transition={200} cachePolicy="memory-disk" />
      )}
      <Text style={styles.title}>{t('verifyAssets.confirmTitle')}</Text>
      <Text style={styles.subdescription}>
        {t('verifyAssets.confirmDesc')}
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleVerify}>
        <Text style={styles.primaryButtonText}>{t('verifyAssets.verify')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setSelectedImageUri(null);
          setStep(1);
        }}
      >
        <Text style={styles.secondaryButtonText}>{t('verifyAssets.reselect')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color="#4CAF50" style={styles.spinner} />
      <Text style={styles.title}>{t('verifyAssets.analyzing')}</Text>
      <Text style={styles.subdescription}>
        {t('verifyAssets.analyzingDesc')}
      </Text>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      {result?.success ? (
        <>
          <View style={styles.resultIconCircle}>
            <Text style={styles.resultIcon}>✅</Text>
          </View>
          <Text style={[styles.title, { color: '#4CAF50' }]}>{t('verifyAssets.successTitle')}</Text>
          <Text style={styles.subdescription}>
            {t('verifyAssets.successDesc')}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.resultIconCircle}>
            <Text style={styles.resultIcon}>❌</Text>
          </View>
          <Text style={[styles.title, { color: '#F44336' }]}>{t('verifyAssets.failTitle')}</Text>
          {result?.diffPercent !== undefined ? (
            <Text style={styles.subdescription}>
              {t('verifyAssets.failDiffDesc', { percent: result.diffPercent.toFixed(1) })}
            </Text>
          ) : (
            <Text style={styles.subdescription}>
              {t('verifyAssets.failGenericDesc')}
            </Text>
          )}
        </>
      )}
      <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
        <Text style={styles.primaryButtonText}>{t('common.confirm')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: '#E0E0E0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  subdescription: {
    color: '#999999',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#2A2A2A',
  },
  spinner: {
    marginBottom: 16,
    marginTop: 8,
  },
  resultIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultIcon: {
    fontSize: 32,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '500',
  },
});
