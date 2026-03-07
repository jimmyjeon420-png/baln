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
import { useLocale } from '../../src/context/LocaleContext';

export default function ManageHeartsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { heartAssets, removeHeartAsset, updateHeartAsset, isLoading } = useHeartAssets();

  const handleDelete = (ticker: string, name: string) => {
    Alert.alert(
      t('manage_hearts.delete_title'),
      t('manage_hearts.delete_message', { name }),
      [
        { text: t('manage_hearts.delete_cancel'), style: 'cancel' },
        {
          text: t('manage_hearts.delete_confirm'),
          style: 'destructive',
          onPress: () => removeHeartAsset(ticker),
        },
      ]
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (item: any) => {
    Alert.prompt(
      t('manage_hearts.rename_title'),
      t('manage_hearts.rename_message', { name: item.name }),
      [
        { text: t('manage_hearts.rename_cancel'), style: 'cancel' },
        {
          text: t('manage_hearts.rename_confirm'),
          onPress: async (newName?: string) => {
            if (newName && newName.trim()) {
              try {
                updateHeartAsset({ ticker: item.ticker, newName: newName.trim() });
                Alert.alert(t('manage_hearts.rename_success_title'), t('manage_hearts.rename_success_message'));
              } catch (error) {
                Alert.alert(t('manage_hearts.rename_error_title'), t('manage_hearts.rename_error_message'));
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
      <HeaderBar title={t('manage_hearts.title')} />

      {/* 목록 */}
      {isLoading ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('manage_hearts.loading')}</Text>
      ) : heartAssets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('manage_hearts.empty_text')}</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/add-asset')}
          >
            <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>{t('manage_hearts.add_button')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={heartAssets}
          keyExtractor={(item) => item.ticker}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
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
    fontSize: 17,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 17,
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
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemTicker: {
    fontSize: 15,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
