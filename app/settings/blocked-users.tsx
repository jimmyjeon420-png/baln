/**
 * 차단 사용자 관리 — 설정 > 차단 목록
 *
 * Apple Guideline 1.2 준수:
 * - 차단된 사용자 목록 표시
 * - 차단 해제 기능
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useBlockedUsers, useUnblockUser, type BlockedUser } from '../../src/hooks/useUserBlocks';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockUser = useUnblockUser();

  const handleUnblock = (item: BlockedUser) => {
    Alert.alert(
      '차단 해제',
      '이 사용자의 차단을 해제하시겠습니까?\n해제하면 이 사용자의 게시물과 댓글이 다시 표시됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단 해제',
          style: 'destructive',
          onPress: async () => {
            try {
              await unblockUser.mutateAsync(item.blocked_user_id);
            } catch {
              Alert.alert('오류', '차단 해제에 실패했습니다.');
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.surface }]}>
      <View style={styles.itemInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="person" size={18} color={colors.error} />
        </View>
        <View style={styles.itemText}>
          <Text style={[styles.userId, { color: colors.textPrimary }]}>
            {item.blocked_user_id.slice(0, 8)}...
          </Text>
          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            {item.reason || '차단됨'} {'·'} {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, { backgroundColor: colors.error + '15' }]}
        onPress={() => handleUnblock(item)}
        disabled={unblockUser.isPending}
      >
        {unblockUser.isPending ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <Text style={[styles.unblockText, { color: colors.error }]}>해제</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>차단 목록</Text>
        <View style={styles.backButton} />
      </View>

      {/* 안내 */}
      <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
        <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          차단된 사용자의 게시물과 댓글은 피드에 표시되지 않습니다.
        </Text>
      </View>

      {/* 목록 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !blockedUsers || blockedUsers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            차단된 사용자가 없습니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
  },
  userId: {
    fontSize: 15,
    fontWeight: '600',
  },
  reason: {
    fontSize: 13,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});
