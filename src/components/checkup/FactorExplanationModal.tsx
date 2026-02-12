/**
 * FactorExplanationModal - 팩터 설명 모달
 * ────────────────────────────────────────
 * Wave 4: 건강 점수 스토리텔링
 * 각 팩터 클릭 시 "왜 중요한지, 사례, 해결법" 표시
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FACTOR_EXPLANATIONS, FactorType } from '../../data/factorExplanations';
import type { ThemeColors } from '../../styles/colors';

interface FactorExplanationModalProps {
  visible: boolean;
  factorType: FactorType | null;
  onClose: () => void;
}

export default function FactorExplanationModal({
  visible,
  factorType,
  onClose,
}: FactorExplanationModalProps) {
  const { colors } = useTheme();

  if (!factorType) return null;

  const explanation = FACTOR_EXPLANATIONS[factorType];
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>{explanation.icon}</Text>
            <Text style={styles.headerTitle}>{explanation.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* 왜 중요한가 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>왜 중요한가요?</Text>
              <Text style={styles.sectionText}>{explanation.why}</Text>
            </View>

            {/* 실제 사례 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>실제 사례</Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleText}>{explanation.example}</Text>
              </View>
            </View>

            {/* 해결 방법 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>어떻게 해결하나요?</Text>
              <View style={styles.solutionBox}>
                <Text style={styles.solutionIcon}>💡</Text>
                <Text style={styles.solutionText}>{explanation.solution}</Text>
              </View>
            </View>

            {/* 역사적 맥락 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>역사적 맥락</Text>
              <View style={styles.contextBox}>
                <Text style={styles.contextText}>{explanation.historicalContext}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 닫기 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerButton} onPress={onClose}>
            <Text style={styles.footerButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  exampleBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  solutionBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: `${colors.primary}14`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
    padding: 16,
  },
  solutionIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  solutionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  contextBox: {
    backgroundColor: `${colors.warning}1A`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.warning}4D`,
    padding: 16,
  },
  contextText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
