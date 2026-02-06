/**
 * 생체인증 서비스
 * - Face ID / 지문 인증 관리
 * - SecureStore로 설정 안전하게 저장
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// SecureStore 키
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const AUTO_LOCK_ENABLED_KEY = 'biometric_auto_lock';

export interface BiometricSettings {
  biometricEnabled: boolean;
  autoLockEnabled: boolean;
}

/**
 * 기기 생체인증 지원 여부 확인
 * @returns 지원하면 true, 아니면 false
 */
export async function checkBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/**
 * 지원되는 생체인증 타입 이름 반환 (Face ID / 지문)
 */
export async function getBiometricTypeName(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return '지문 인식';
    }
    return '생체 인증';
  } catch {
    return '생체 인증';
  }
}

/**
 * 생체인증 실행
 * @returns 인증 성공 여부
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '본인 확인을 위해 인증해주세요',
      cancelLabel: '취소',
      disableDeviceFallback: false, // PIN 폴백 허용
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * SecureStore에서 저장된 설정 로드
 */
export async function getBiometricSettings(): Promise<BiometricSettings> {
  try {
    const biometricRaw = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    const autoLockRaw = await SecureStore.getItemAsync(AUTO_LOCK_ENABLED_KEY);

    return {
      biometricEnabled: biometricRaw === 'true',
      autoLockEnabled: autoLockRaw !== 'false', // 기본값 true
    };
  } catch {
    return { biometricEnabled: false, autoLockEnabled: true };
  }
}

/**
 * SecureStore에 설정 저장
 */
export async function saveBiometricSettings(settings: BiometricSettings): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(settings.biometricEnabled));
    await SecureStore.setItemAsync(AUTO_LOCK_ENABLED_KEY, String(settings.autoLockEnabled));
  } catch (err) {
    console.error('생체인증 설정 저장 실패:', err);
  }
}
