/**
 * ItemPurchaseModal.tsx - 마켓플레이스 아이템 구매 모달
 *
 * 역할: "상품 결제 창구"
 * - 아이템 정보 + 현재 잔액 표시
 * - 잔액 부족 시 경고 + 버튼 비활성화
 * - 구매 확인 시 크레딧 차감 + AsyncStorage에 활성화 상태 저장
 *
 * 참고: 무료 기간(~5/31) 동안은 실제 크레딧 차감 없이 아이템 활성화
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../services/supabase';
import { type MarketplaceItem } from '../../data/marketplaceItems';
import { isFreePeriod } from '../../config/freePeriod';

// 아이템 활성화 상태 저장 키
const ITEM_ACTIVE_PREFIX = '@baln:marketplace_active_';

export interface ItemActivation {
  itemId: string;
  activatedAt: number;
  expiresAt: number | null; // null = 영구
}

/** 아이템 활성화 여부 조회 */
export async function getItemActivation(itemId: string): Promise<ItemActivation | null> {
  try {
    const raw = await AsyncStorage.getItem(ITEM_ACTIVE_PREFIX + itemId);
    if (!raw) return null;
    const data: ItemActivation = JSON.parse(raw);
    // 만료된 경우
    if (data.expiresAt && data.expiresAt < Date.now()) {
      await AsyncStorage.removeItem(ITEM_ACTIVE_PREFIX + itemId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** 아이템 활성화 상태 저장 */
async function activateItem(item: MarketplaceItem): Promise<void> {
  const durationMs: Record<string, number> = {
    premium_trial_3d: 3 * 24 * 60 * 60 * 1000,
    vip_lounge_1w: 7 * 24 * 60 * 60 * 1000,
  };

  const duration = durationMs[item.id] ?? null;
  const activation: ItemActivation = {
    itemId: item.id,
    activatedAt: Date.now(),
    expiresAt: duration ? Date.now() + duration : null,
  };
  await AsyncStorage.setItem(ITEM_ACTIVE_PREFIX + item.id, JSON.stringify(activation));
}

interface ItemPurchaseModalProps {
  item: MarketplaceItem | null;
  visible: boolean;
  /** 현재 보유 크레딧 */
  balance: number;
  onClose: () => void;
  onSuccess: (item: MarketplaceItem) => void;
}

export function ItemPurchaseModal({
  item,
  visible,
  balance,
  onClose,
  onSuccess,
}: ItemPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!item) return null;

  const freePeriod = isFreePeriod();
  const canAfford = freePeriod || balance >= item.price;

  const handleClose = () => {
    setSucceeded(false);
    setErrorMsg(null);
    onClose();
  };

  const handlePurchase = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!freePeriod) {
        // 무료 기간 이후: Supabase RPC로 실제 차감
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) throw new Error('로그인이 필요합니다.');

        const { error } = await supabase.rpc('spend_credits', {
          p_user_id: userId,
          p_amount: item.price,
          p_feature_type: 'marketplace_item',
          p_feature_ref_id: item.id,
        });
        if (error) throw new Error(error.message);
      }

      // 아이템 활성화 상태 저장
      await activateItem(item);

      setSucceeded(true);
      setTimeout(() => {
        handleClose();
        onSuccess(item);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || '구매 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {succeeded ? (
            /* ── 성공 상태 ── */
            <View style={styles.successState}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>구매 완료!</Text>
              <Text style={styles.successDesc}>{item.name} 활성화됨</Text>
            </View>
          ) : (
            /* ── 구매 확인 상태 ── */
            <>
              {/* 아이템 헤더 */}
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>

              {/* 잔액 & 비용 */}
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>보유 크레딧</Text>
                  <Text style={styles.infoValue}>
                    {freePeriod ? '∞ (무료 기간)' : `${balance}C (₩${(balance * 100).toLocaleString()})`}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>비용</Text>
                  <Text style={styles.infoCost}>
                    {freePeriod ? '무료' : `${item.price}C (₩${item.priceKRW.toLocaleString()})`}
                  </Text>
                </View>
              </View>

              {/* 잔액 부족 경고 */}
              {!freePeriod && !canAfford && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    크레딧이 부족합니다. {item.price - balance}C 더 필요해요.
                  </Text>
                </View>
              )}

              {/* 에러 */}
              {errorMsg && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>{errorMsg}</Text>
                </View>
              )}

              {/* 버튼 */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, (!canAfford || loading) && styles.confirmBtnDisabled]}
                  onPress={handlePurchase}
                  disabled={!canAfford || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmText}>
                      {freePeriod ? '무료 획득' : '구매하기'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
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
    paddingHorizontal: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: '#1e1e2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  // ── 아이템 정보 ──
  itemIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  itemDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  // ── 잔액/비용 박스 ──
  infoBox: {
    width: '100%',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoCost: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#3a3a5e',
    marginVertical: 10,
  },
  // ── 경고 ──
  warningBox: {
    width: '100%',
    backgroundColor: '#FF453A20',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  // ── 버튼 ──
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#2a2a3e',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ── 성공 상태 ──
  successState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
