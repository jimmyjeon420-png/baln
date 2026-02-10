/**
 * useTheme.ts - 테마 훅 (편의용 재export)
 *
 * 역할: "테마 사용 도구"
 * - ThemeContext의 useTheme을 재export
 * - 컴포넌트에서 짧은 경로로 import 가능
 *
 * 사용 예시:
 * ```tsx
 * import { useTheme } from '../../src/hooks/useTheme';
 *
 * const { theme, colors, setThemeMode } = useTheme();
 * ```
 */

export { useTheme, type ThemeMode, type ActiveTheme } from '../contexts/ThemeContext';
