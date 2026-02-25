/**
 * TypewriterText — 타자기 효과 텍스트
 *
 * 역할: 텍스트를 1자씩 표시하여 거장이 "말하는 중"인 느낌 제공
 * - 탭하면 즉시 전체 표시 (스킵)
 * - onComplete 콜백으로 다음 턴 트리거
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TypewriterTextProps {
  /** 표시할 전체 텍스트 */
  text: string;
  /** 글자당 딜레이 (ms) */
  speed?: number;
  /** 전체 표시 완료 시 콜백 */
  onComplete?: () => void;
  /** 텍스트 색상 */
  color?: string;
  /** 즉시 전체 표시 (히스토리 턴) */
  instant?: boolean;
}

export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  color = '#D1D5DB',
  instant = false,
}: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = useState(instant ? text.length : 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (instant) {
      setDisplayedLength(text.length);
      return;
    }

    setDisplayedLength(0);
    completedRef.current = false;

    timerRef.current = setInterval(() => {
      setDisplayedLength(prev => {
        const next = prev + 1;
        if (next >= text.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!completedRef.current) {
            completedRef.current = true;
            // 약간의 딜레이 후 완료 콜백 (읽을 시간)
            setTimeout(() => onComplete?.(), 500);
          }
          return text.length;
        }
        return next;
      });
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed, instant, onComplete]);

  const handleSkip = useCallback(() => {
    if (displayedLength >= text.length) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedLength(text.length);
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [displayedLength, text.length, onComplete]);

  const displayedText = text.substring(0, displayedLength);
  const isComplete = displayedLength >= text.length;

  return (
    <TouchableOpacity
      onPress={handleSkip}
      activeOpacity={isComplete ? 1 : 0.7}
      disabled={isComplete}
    >
      <Text style={[styles.text, { color }]}>
        {displayedText}
        {!isComplete && <Text style={styles.cursor}>|</Text>}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: '#4CAF50',
    fontWeight: '300',
  },
});
