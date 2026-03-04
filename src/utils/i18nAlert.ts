/**
 * i18nAlert.ts — Alert.alert을 t()로 감싸는 헬퍼
 *
 * 역할: Alert.alert 호출 시 번역 키를 받아 자동으로 t() 변환
 * 비유: 안내판 자동 번역기 — 키만 넣으면 현재 언어로 알아서 출력
 *
 * 사용법:
 *   import { i18nAlert } from '@/utils/i18nAlert';
 *   i18nAlert('alert.deleteConfirm.title', 'alert.deleteConfirm.message', [
 *     { textKey: 'common.cancel', style: 'cancel' },
 *     { textKey: 'common.delete', style: 'destructive', onPress: handleDelete },
 *   ]);
 */

import { Alert, AlertButton } from 'react-native';
import { t } from '../locales';

/** i18n-aware Alert button — textKey가 있으면 t()로 변환, 없으면 text 그대로 사용 */
export interface I18nAlertButton {
  /** 번역 키 (이 값이 있으면 text 무시) */
  textKey?: string;
  /** 번역 키 없이 직접 텍스트 */
  text?: string;
  style?: AlertButton['style'];
  onPress?: () => void;
}

/**
 * i18nAlert — 번역 키 기반 Alert.alert
 *
 * @param titleKey - 제목 번역 키
 * @param messageKey - 메시지 번역 키 (옵션, interpolation 파라미터도 가능)
 * @param buttons - 버튼 배열 (textKey 또는 text)
 * @param messageOptions - 메시지 키의 interpolation 옵션
 */
export function i18nAlert(
  titleKey: string,
  messageKey?: string,
  buttons?: I18nAlertButton[],
  messageOptions?: Record<string, string | number>,
): void {
  const title = t(titleKey);
  const message = messageKey ? t(messageKey, messageOptions) : undefined;

  const alertButtons: AlertButton[] | undefined = buttons?.map((btn) => ({
    text: btn.textKey ? t(btn.textKey) : (btn.text ?? ''),
    style: btn.style,
    onPress: btn.onPress,
  }));

  Alert.alert(title, message, alertButtons);
}

/**
 * i18nConfirm — 확인/취소 패턴 간편 함수
 *
 * @param titleKey - 제목 번역 키
 * @param messageKey - 메시지 번역 키
 * @param onConfirm - 확인 시 콜백
 * @param confirmKey - 확인 버튼 키 (기본: 'common.confirm')
 * @param cancelKey - 취소 버튼 키 (기본: 'common.cancel')
 */
export function i18nConfirm(
  titleKey: string,
  messageKey: string,
  onConfirm: () => void,
  confirmKey = 'common.confirm',
  cancelKey = 'common.cancel',
  messageOptions?: Record<string, string | number>,
): void {
  i18nAlert(titleKey, messageKey, [
    { textKey: cancelKey, style: 'cancel' },
    { textKey: confirmKey, onPress: onConfirm },
  ], messageOptions);
}
