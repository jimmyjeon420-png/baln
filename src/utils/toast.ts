/**
 * toast.ts — Simple toast/alert utility for error and success feedback
 *
 * Uses Alert.alert on native, console on web.
 * Integrates with i18n via t() for localized messages.
 */

import { Alert, Platform } from 'react-native';
import { t } from '../locales';

/**
 * Show an error alert to the user.
 * @param message - The error message (plain text or i18n key)
 * @param title - Optional title (defaults to localized 'Error')
 */
export const showErrorToast = (message: string, title?: string) => {
  if (Platform.OS === 'web') {
    console.error(title || 'Error', message);
    return;
  }
  Alert.alert(
    title || t('common.error_title', { defaultValue: '오류' }),
    message,
    [{ text: t('common.ok') }],
  );
};

/**
 * Show a success alert to the user.
 * @param message - The success message
 */
export const showSuccessToast = (message: string) => {
  if (Platform.OS !== 'web') {
    Alert.alert('', message, [{ text: t('common.ok') }], { cancelable: true });
  }
};
