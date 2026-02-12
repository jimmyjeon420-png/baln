/**
 * CreditDisplay - 큰 크레딧 잔액 표시 (프로필 화면용)
 *
 * 역할: "내 지갑 카드"
 * - 크레딧 잔액을 크고 명확하게 표시
 * - 항상 원화 환산 값 병기 (1C = ₩100)
 * - 터치하면 마켓플레이스로 이동
 *
 * 철학: "포인트는 현금만 못하다. 원화를 옆에 병기하라" (버핏)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMyCredits } from '../../hooks/useCredits';
import { formatCredits } from '../../utils/formatters';

/** 충전 기능 오픈일 (6월 1일부터 활성화) */
const CHARGE_OPEN_DATE = new Date('2026-06-01T00:00:00');

/** 무료 체험 종료일 표시용 */
const FREE_TRIAL_LABEL = '5/31';

function isChargingOpen(): boolean {
  return new Date() >= CHARGE_OPEN_DATE;
}

interface CreditDisplayProps {
  /** 커스텀 클릭 핸들러 (기본: 마켓플레이스 이동) */
  onPress?: () => void;
}

export function CreditDisplay({ onPress }: CreditDisplayProps) {
  const { data: credits, isLoading } = useMyCredits();
  const balance = credits?.balance ?? 0;
  const chargingOpen = isChargingOpen();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (chargingOpen) {
      router.push('/marketplace/credits');
    }
    // 무료 체험 기간에는 카드 터치해도 이동 안 함
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.loadingCard]}>
          <View style={styles.loadingShimmer} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <LinearGradient
          colors={['#9333EA', '#DB2777']} // purple-600 → pink-600
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={20} color="#FFF" />
            </View>
            <Text style={styles.label}>내 크레딧</Text>
          </View>

          {/* 크레딧 잔액 */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceMain}>{balance.toLocaleString()}</Text>
            <Text style={styles.balanceSymbol}>C</Text>
          </View>

          {/* 원화 환산 */}
          <Text style={styles.balanceKRW}>
            ₩{(balance * 100).toLocaleString()}
          </Text>

          {/* 충전 버튼 / 무료 체험 안내 */}
          <View style={[styles.footer, !chargingOpen && styles.footerTrial]}>
            <View style={styles.plusIcon}>
              <Ionicons
                name={chargingOpen ? 'add-circle' : 'gift'}
                size={16}
                color="#FFF"
              />
            </View>
            <Text style={styles.footerText}>
              {chargingOpen ? '충전하기' : `${FREE_TRIAL_LABEL}까지 무료 체험 중`}
            </Text>
          </View>

          {/* 장식 원 */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingCard: {
    backgroundColor: '#1F1F1F',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingShimmer: {
    width: '80%',
    height: 60,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.9,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  balanceMain: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
  },
  balanceSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4,
    opacity: 0.9,
  },
  balanceKRW: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.7,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  footerTrial: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
  },
  plusIcon: {
    marginRight: 6,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  // 장식 원
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
