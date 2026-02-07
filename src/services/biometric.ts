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

// 메모리 캐시 (앱 실행 중 1회 로드 후 재사용 → 포그라운드 복귀 시 0ms)
let _cachedSettings: BiometricSettings | null = null;

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
 * SecureStore에서 저장된 설정 로드 (메모리 캐시 우선)
 * 포그라운드 복귀 시 SecureStore 접근 없이 즉시 반환 (0ms)
 */
export async function getBiometricSettings(): Promise<BiometricSettings> {
  // 캐시 히트: SecureStore 접근 없이 즉시 반환
  if (_cachedSettings) return _cachedSettings;

  try {
    const [biometricRaw, autoLockRaw] = await Promise.all([
      SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.getItemAsync(AUTO_LOCK_ENABLED_KEY),
    ]);

    _cachedSettings = {
      biometricEnabled: biometricRaw === 'true',
      autoLockEnabled: autoLockRaw !== 'false', // 기본값 true
    };
    return _cachedSettings;
  } catch {
    return { biometricEnabled: false, autoLockEnabled: true };
  }
}

/**
 * SecureStore에 설정 저장 + 메모리 캐시 동기화
 */
export async function saveBiometricSettings(settings: BiometricSettings): Promise<void> {
  try {
    // 캐시 즉시 업데이트 (다음 getBiometricSettings 호출 시 SecureStore 접근 불필요)
    _cachedSettings = { ...settings };

    await Promise.all([
      SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(settings.biometricEnabled)),
      SecureStore.setItemAsync(AUTO_LOCK_ENABLED_KEY, String(settings.autoLockEnabled)),
    ]);
  } catch (err) {
    console.error('생체인증 설정 저장 실패:', err);
  }
}
