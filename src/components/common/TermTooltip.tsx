/**
 * TermTooltip.tsx - 투자 용어 탭하면 쉬운 설명 팝업
 *
 * 이승건 원칙: "모르는 단어가 장벽이 되면 안 된다"
 * 버핏 원칙: "쉬운 언어로 설명 못하면 이해 못한 것"
 *
 * 사용법:
 *   <TermTooltip term="리밸런싱">리밸런싱</TermTooltip>
 *   <TermTooltip term="코스톨라니" style={{ fontSize: 18 }}>코스톨라니</TermTooltip>
 *
 * 중복 방지: AllocationDriftSection의 CATEGORY_DETAILS(자산군 ⓘ)와 겹치지 않도록
 * 자산군(주식, 채권, 금, 원자재 등) 카테고리 설명에는 사용하지 않음.
 * "배분 이탈도", "리밸런싱", "코스톨라니", "처방전", "건강 점수" 등 개념 용어에만 사용.
 */

import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextStyle,
} from 'react-native';
import { INVESTMENT_TERMS } from '../../data/investmentTerms';
import { useTheme } from '../../hooks/useTheme';

interface TermTooltipProps {
  /** 용어 키 — investmentTerms.ts의 INVESTMENT_TERMS 키와 일치해야 함 */
  term: string;
  /** 표시할 텍스트 (보통 term과 같지만 다를 수 있음) */
  children: React.ReactNode;
  /** 추가 텍스트 스타일 */
  style?: TextStyle | TextStyle[];
}

export default function TermTooltip({ term, children, style }: TermTooltipProps) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  const termData = INVESTMENT_TERMS[term];

  // 용어 사전에 없으면 그냥 텍스트로 렌더링
  if (!termData) {
    return <Text style={style}>{children}</Text>;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${term} 용어 설명 보기`}
      >
        <Text
          style={[
            {
              borderBottomWidth: 1,
              borderBottomColor: colors.primary,
              borderStyle: 'dashed',
              color: colors.textPrimary,
            },
            style,
          ]}
        >
          {children}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          {/* 내부를 눌러도 닫히지 않도록 stopPropagation */}
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderLeftColor: colors.border,
                borderRightColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* 핸들 바 */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* 제목 */}
            <View style={styles.titleRow}>
              <Text style={styles.titleEmoji}>{termData.emoji}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {termData.title}
              </Text>
            </View>

            {/* 한 줄 요약 (강조 배경) */}
            <View style={[styles.simpleBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.simpleText, { color: colors.primary }]}>
                💡 {termData.simple}
              </Text>
            </View>

            {/* 상세 설명 */}
            <Text style={[styles.detail, { color: colors.textSecondary }]}>
              {termData.detail}
            </Text>

            {/* 실생활 예시 */}
            {termData.example && (
              <View
                style={[
                  styles.exampleBox,
                  {
                    backgroundColor: colors.surfaceLight,
                    borderLeftColor: colors.textSecondary,
                  },
                ]}
              >
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  {termData.example}
                </Text>
              </View>
            )}

            {/* 거장 명언 */}
            {termData.quote && (
              <View style={styles.quoteBox}>
                <Text style={[styles.quoteText, { color: colors.textTertiary }]}>
                  "{termData.quote}"
                </Text>
                {termData.quoteAuthor && (
                  <Text style={[styles.quoteAuthor, { color: colors.textTertiary }]}>
                    — {termData.quoteAuthor}
                  </Text>
                )}
              </View>
            )}

            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}
              onPress={() => setVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>
                닫기
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
    opacity: 0.4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  simpleBadge: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  simpleText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  detail: {
    fontSize: 14,
    lineHeight: 22,
  },
  exampleBox: {
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  quoteBox: {
    gap: 4,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quoteAuthor: {
    fontSize: 12,
    textAlign: 'right',
  },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
