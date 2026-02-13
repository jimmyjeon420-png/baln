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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useHeartAssets } from '../../src/hooks/useHeartAssets';
import { useTheme } from '../../src/hooks/useTheme';

export default function ManageHeartsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { heartAssets, removeHeartAsset, updateHeartAsset, isLoading } = useHeartAssets();

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
          onPress: async (newName?: string) => {
            if (newName && newName.trim()) {
              try {
                updateHeartAsset({ ticker: item.ticker, newName: newName.trim() });
                Alert.alert('완료', '이름이 변경되었습니다.');
              } catch (error) {
                Alert.alert('오류', '이름 변경에 실패했습니다.');
              }
            }
          },
        },
      ],
      'plain-text',
      item.name
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="Heart 자산 관리" />

      {/* 목록 */}
      {isLoading ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>로딩 중...</Text>
      ) : heartAssets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Heart한 자산이 없습니다</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/add-asset')}
          >
            <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>자산 추가하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={heartAssets}
          keyExtractor={(item) => item.ticker}
          renderItem={({ item }) => (
            <View style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.itemTicker, { color: colors.textSecondary }]}>{item.ticker}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 12 }}
                >
                  <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.ticker, item.name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemTicker: {
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
