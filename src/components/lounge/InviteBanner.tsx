/**
 * InviteBanner.tsx — 친구 초대 배너
 * 라운지 상단에 "친구 초대하면 5C 보너스" 배너 표시
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

interface InviteBannerProps {
  onInvite?: () => void;
}

export default function InviteBanner({ onInvite }: InviteBannerProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const handleInvite = async () => {
    try {
      const message = t('lounge.invite_share_message');
      const url = 'https://baln.app';
      await Share.share({
        message: `${message}\n\n${url}`,
        url: Platform.OS === 'ios' ? url : undefined,
      });
      onInvite?.();
    } catch {
      // User cancelled or share failed — silent
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
      onPress={handleInvite}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.emoji}>{'🎁'}</Text>
        <View>
          <Text style={[styles.title, { color: colors.primary }]}>
            {t('lounge.invite_banner_title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('lounge.invite_banner_subtitle')}
          </Text>
        </View>
      </View>
      <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
