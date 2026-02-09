/**
 * manage-hearts.tsx - Heart 자산 관리
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHeartAssets } from '../../src/hooks/useHeartAssets';
import { COLORS } from '../../src/styles/theme';

export default function ManageHeartsScreen() {
  const router = useRouter();
  const { heartAssets, removeHeartAsset, isLoading } = useHeartAssets();

  const handleDelete = (ticker: string, name: string) => {
    Alert.alert(
      'Heart 삭제',
      `${name}을(를) Heart에서 제거하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => removeHeartAsset(ticker),
        },
      ]
    );
  };

  const handleEdit = (item: any) => {
    Alert.prompt(
      'Heart 이름 변경',
      `${item.name}의 새 이름을 입력하세요`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: (newName?: string) => {
            if (newName && newName.trim()) {
              // TODO: useHeartAssets에 updateHeartAsset 추가 필요
              console.log('Update:', item.ticker, newName);
            }
          },
        },
      ],
      'plain-text',
      item.name
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Heart 자산 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 목록 */}
      {isLoading ? (
        <Text style={styles.emptyText}>로딩 중...</Text>
      ) : heartAssets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyText}>Heart한 자산이 없습니다</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-asset')}
          >
            <Text style={styles.addButtonText}>자산 추가하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={heartAssets}
          keyExtractor={(item) => item.ticker}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTicker}>{item.ticker}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 12 }}
                >
                  <Ionicons name="pencil-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.ticker, item.name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemTicker: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
