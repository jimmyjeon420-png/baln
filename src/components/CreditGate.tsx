/**
 * CreditGate - 크레딧 확인 모달 (기능 실행 전 "출입문")
 * 잔액 충분: "분석 시작" + 차감 크레딧 표시
 * 잔액 부족: "충전하기" + 구독 유도
 * 티어 할인 표시 (취소선 + 할인가)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyCredits } from '../hooks/useCredits';
import { getDiscountedCost } from '../services/creditService';
import { useHaptics } from '../hooks/useHaptics';
import type { AIFeatureType } from '../types/marketplace';
import { FEATURE_LABELS } from '../types/marketplace';
import type { UserTier } from '../types/database';

interface CreditGateProps {
  visible: boolean;
  featureType: AIFeatureType;
  userTier: UserTier;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CreditGate({
  visible,
  featureType,
  userTier,
  loading = false,
  onConfirm,
  onCancel,
}: CreditGateProps) {
  const router = useRouter();
  const { data: credits } = useMyCredits();
  const { mediumTap, heavyTap } = useHaptics();

  const balance = credits?.balance ?? 0;
  const { originalCost, discountedCost, discountPercent } = getDiscountedCost(featureType, userTier);
  const hasEnough = balance >= discountedCost;
  const featureLabel = FEATURE_LABELS[featureType];

  const handleConfirm = () => {
    heavyTap();
    onConfirm();
  };

  const handleCharge = () => {
    mediumTap();
    onCancel();
    router.push('/marketplace/credits');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Ionicons
              name={hasEnough ? 'diamond' : 'alert-circle'}
              size={40}
              color={hasEnough ? '#7C4DFF' : '#CF6679'}
            />
            <Text style={styles.title}>
              {hasEnough ? featureLabel : '크레딧 부족'}
            </Text>
          </View>

          {/* 비용 정보 */}
          <View style={styles.costContainer}>
            <Text style={styles.costLabel}>필요 크레딧</Text>
            <View style={styles.costRow}>
              {discountPercent > 0 && (
                <Text style={styles.originalCost}>{originalCost}</Text>
              )}
              <Ionicons name="diamond" size={18} color="#7C4DFF" />
              <Text style={styles.discountedCost}>{discountedCost}</Text>
              {discountPercent > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{discountPercent}%</Text>
                </View>
              )}
            </View>
            {discountPercent > 0 && (
              <Text style={styles.tierNote}>
                {userTier} 등급 할인 적용
              </Text>
            )}
          </View>

          {/* 잔액 */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>보유 크레딧</Text>
            <Text style={[styles.balanceValue, !hasEnough && styles.insufficientBalance]}>
              {balance.toLocaleString()}
            </Text>
          </View>

          {!hasEnough && (
            <Text style={styles.shortageText}>
              {discountedCost - balance} 크레딧이 부족합니다
            </Text>
          )}

          {/* 버튼 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>

            {hasEnough ? (
              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={handleConfirm}
                activeOpacity={0.7}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#FFF" />
                    <Text style={styles.confirmButtonText}>분석 시작</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.chargeButton}
                onPress={handleCharge}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={16} color="#FFF" />
                <Text style={styles.chargeButtonText}>충전하기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 구독 유도 (잔액 부족 시) */}
          {!hasEnough && (
            <TouchableOpacity
              style={styles.subscriptionHint}
              onPress={() => {
                onCancel();
                router.push('/subscription/paywall');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.subscriptionHintText}>
                구독하면 매월 50 크레딧 무료!
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  costContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 12,
  },
  costLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originalCost: {
    color: '#666',
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  discountedCost: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tierNote: {
    color: '#4CAF50',
    fontSize: 11,
    marginTop: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  balanceValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  insufficientBalance: {
    color: '#CF6679',
  },
  shortageText: {
    color: '#CF6679',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7C4DFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  chargeButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chargeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  subscriptionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingVertical: 8,
  },
  subscriptionHintText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
});
