/**
 * HouseInteriorModal — 집 인테리어 가구 배치 모달
 *
 * 역할: 집 내부를 그리드로 보여주고 가구를 배치/제거하는 UI
 * 비유: 동물의숲 집 꾸미기 화면 — 가구를 놓고 빼는 인테리어 모드
 *
 * 특징:
 * - 집 레벨에 따른 슬롯 수 (1~12칸)
 * - 배치된 가구 = 이모지 타일, 빈 슬롯 = 점선 테두리
 * - 배치된 가구 탭 → 제거 확인
 * - "가구 추가" 버튼 → 해금된 인벤토리에서 선택
 *
 * 사용처: HouseView 탭 시 열림
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import type { HouseLevel, FurnitureItem } from '../../data/houseConfig';

// ============================================================================
// 타입
// ============================================================================

interface HouseInteriorModalProps {
  visible: boolean;
  onClose: () => void;
  houseLevel: HouseLevel;
  placedFurniture: FurnitureItem[];
  inventoryFurniture: FurnitureItem[];
  maxSlots: number;
  onPlaceFurniture: (furnitureId: string) => Promise<boolean>;
  onRemoveFurniture: (furnitureId: string) => Promise<void>;
  locale?: string;
}

// ============================================================================
// 카테고리 라벨
// ============================================================================

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  wall: { ko: '벽 장식', en: 'Wall' },
  floor: { ko: '바닥 장식', en: 'Floor' },
  table: { ko: '탁상 장식', en: 'Table' },
  decoration: { ko: '기타 장식', en: 'Decoration' },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function HouseInteriorModal({
  visible,
  onClose,
  houseLevel,
  placedFurniture,
  inventoryFurniture,
  maxSlots,
  onPlaceFurniture,
  onRemoveFurniture,
  locale = 'ko',
}: HouseInteriorModalProps) {
  const [showInventory, setShowInventory] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isKo = locale === 'ko';

  // 입장 애니메이션
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
      setShowInventory(false);
      setConfirmRemoveId(null);
    }
  }, [visible, slideAnim]);

  const hasEmptySlot = placedFurniture.length < maxSlots;
  const emptySlotCount = maxSlots - placedFurniture.length;

  // ── 가구 배치 ──
  const handlePlace = async (item: FurnitureItem) => {
    const success = await onPlaceFurniture(item.id);
    if (success) {
      setShowInventory(false);
    }
  };

  // ── 가구 제거 ──
  const handleRemove = async (furnitureId: string) => {
    await onRemoveFurniture(furnitureId);
    setConfirmRemoveId(null);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: slideAnim }],
            },
          ]}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.houseEmoji}>{houseLevel.emoji}</Text>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>
                {isKo ? houseLevel.nameKo : houseLevel.nameEn}
              </Text>
              <Text style={styles.headerSubtitle}>
                Lv.{houseLevel.level} {isKo ? '인테리어' : 'Interior'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 슬롯 카운터 */}
          <View style={styles.slotCounter}>
            <Text style={styles.slotText}>
              {isKo
                ? `가구 ${placedFurniture.length} / ${maxSlots}칸`
                : `Furniture ${placedFurniture.length} / ${maxSlots} slots`}
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 가구 그리드 */}
            <View style={styles.grid}>
              {/* 배치된 가구 */}
              {placedFurniture.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCell,
                    confirmRemoveId === item.id && styles.gridCellSelected,
                  ]}
                  onPress={() => {
                    if (confirmRemoveId === item.id) {
                      handleRemove(item.id);
                    } else {
                      setConfirmRemoveId(item.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cellEmoji}>{item.emoji}</Text>
                  <Text style={styles.cellName} numberOfLines={1}>
                    {isKo ? item.nameKo : item.nameEn}
                  </Text>
                  {confirmRemoveId === item.id && (
                    <Text style={styles.removeHint}>
                      {isKo ? '탭하여 제거' : 'Tap to remove'}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}

              {/* 빈 슬롯 */}
              {Array.from({ length: emptySlotCount }).map((_, idx) => (
                <TouchableOpacity
                  key={`empty_${idx}`}
                  style={[styles.gridCell, styles.emptyCell]}
                  onPress={() => {
                    if (inventoryFurniture.length > 0) setShowInventory(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyPlus}>+</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 인벤토리 (해금된 미배치 가구) */}
            {showInventory && inventoryFurniture.length > 0 && (
              <View style={styles.inventorySection}>
                <Text style={styles.inventoryTitle}>
                  {isKo ? '배치 가능한 가구' : 'Available Furniture'}
                </Text>
                {inventoryFurniture.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inventoryRow}
                    onPress={() => handlePlace(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.inventoryEmoji}>{item.emoji}</Text>
                    <View style={styles.inventoryInfo}>
                      <Text style={styles.inventoryName}>
                        {isKo ? item.nameKo : item.nameEn}
                      </Text>
                      <Text style={styles.inventoryCategory}>
                        {isKo
                          ? (CATEGORY_LABELS[item.category]?.ko || item.category)
                          : (CATEGORY_LABELS[item.category]?.en || item.category)}
                      </Text>
                    </View>
                    <Text style={styles.placeButton}>
                      {isKo ? '배치' : 'Place'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 가구 추가 버튼 (인벤토리가 숨겨져 있을 때) */}
            {!showInventory && hasEmptySlot && inventoryFurniture.length > 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowInventory(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>
                  {isKo ? '+ 가구 추가하기' : '+ Add Furniture'}
                </Text>
              </TouchableOpacity>
            )}

            {/* 인벤토리가 비어있을 때 */}
            {inventoryFurniture.length === 0 && hasEmptySlot && (
              <Text style={styles.emptyInventoryText}>
                {isKo
                  ? '마을 번영도를 올리면 새 가구가 해금됩니다!'
                  : 'Raise village prosperity to unlock new furniture!'}
              </Text>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default HouseInteriorModal;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  houseEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  slotCounter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  slotText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCell: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  gridCellSelected: {
    borderWidth: 2,
    borderColor: '#FF5722',
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
  },
  cellEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  cellName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    textAlign: 'center',
  },
  removeHint: {
    color: '#FF5722',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCell: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
  },
  emptyPlus: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 24,
    fontWeight: '300',
  },
  inventorySection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
  },
  inventoryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  inventoryEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  inventoryCategory: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginTop: 2,
  },
  placeButton: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  addButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyInventoryText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
