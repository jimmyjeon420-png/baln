/**
 * GuruVillage — 구루 마을 메인 컴포넌트
 *
 * 역할: "동물의숲 마을" — 모든 마을 요소를 합쳐 하나의 씬을 구성
 * - VillageBackground: 시간대별 하늘 + 별 + 바닥
 * - WanderingGuru: 걸어다니는 NPC 구루들
 * - GuruChatModal: 구루 탭 시 1:1 대화
 * - 마을 간판/오브젝트: 동물의숲 감성 디테일
 *
 * 동물의숲 감성 포인트:
 * 🌿 둥근 잔디 위를 걸어다니는 NPC들
 * 🌸 시간에 따라 바뀌는 하늘 (새벽 핑크 → 밤 별빛)
 * 💬 NPC들이 서로 대화하고 사용자와도 소통
 * 🏠 마을 간판, 나무, 풍경 소품
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VillageBackground } from './VillageBackground';
import { WanderingGuru } from './WanderingGuru';
import { GuruChatModal } from './GuruChatModal';
import { useGuruVillage } from '../../hooks/useGuruVillage';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';
import { useLocale } from '../../context/LocaleContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VILLAGE_HEIGHT = 280;

interface GuruVillageProps {
  /** 마을 높이 (기본 280) */
  height?: number;
  /** 라운드테이블 버튼 클릭 시 */
  onRoundtablePress?: () => void;
}

/** 마을 간판 (동물의숲 게시판 느낌) */
function VillageSignBoard({ greeting, label, villageName }: { greeting: string; label: string; villageName: string }) {
  return (
    <View style={signStyles.container}>
      {/* 나무 기둥 */}
      <View style={signStyles.pole} />
      {/* 간판 본체 */}
      <View style={signStyles.board}>
        <Text style={signStyles.greeting}>{greeting}</Text>
        <Text style={signStyles.label}>🏘️ {villageName} · {label}</Text>
      </View>
    </View>
  );
}

const signStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 10,
    alignItems: 'center',
  },
  pole: {
    width: 4,
    height: 12,
    backgroundColor: '#8B6914',
    borderRadius: 2,
  },
  board: {
    backgroundColor: '#2A1810E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#8B691440',
    gap: 1,
  },
  greeting: {
    fontSize: 10,
    color: '#F0C060',
    fontWeight: '600',
  },
  label: {
    fontSize: 9,
    color: '#D4B896',
  },
});

/** 마을 나무 소품 (동물의숲 장식) */
function VillageTree({ x, size = 'md' }: { x: number; size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  const trunkW = isSm ? 4 : 6;
  const trunkH = isSm ? 8 : 12;
  const leafSize = isSm ? 16 : 22;

  return (
    <View style={[treeStyles.container, { left: `${x}%` as any }]}>
      {/* 나뭇잎 (둥근 초록) */}
      <View
        style={[
          treeStyles.leaves,
          {
            width: leafSize,
            height: leafSize,
            borderRadius: leafSize / 2,
          },
        ]}
      />
      {/* 줄기 */}
      <View
        style={[treeStyles.trunk, { width: trunkW, height: trunkH }]}
      />
    </View>
  );
}

const treeStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '28%',
    alignItems: 'center',
    zIndex: 1,
  },
  leaves: {
    backgroundColor: '#3D8B4080',
  },
  trunk: {
    backgroundColor: '#8B691430',
    borderRadius: 2,
    marginTop: -2,
  },
});

/** 마을 꽃 소품 */
function VillageFlower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <View
      style={[
        flowerStyles.container,
        { left: `${x}%` as any, bottom: `${y}%` as any },
      ]}
    >
      <Text style={flowerStyles.emoji}>{color}</Text>
    </View>
  );
}

const flowerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1,
  },
  emoji: {
    fontSize: 10,
  },
});

export function GuruVillage({ height = VILLAGE_HEIGHT, onRoundtablePress }: GuruVillageProps) {
  const isCompactPreview = height < VILLAGE_HEIGHT;
  const timeTheme = useTimeOfDay();
  const { t } = useLocale();
  const {
    positions,
    isLoading,
    userChatGuru,
    userChatMessages,
    isUserChatLoading,
    userChatError,
    openGuruChat,
    closeGuruChat,
    sendMessageToGuru,
    retryLastMessage,
  } = useGuruVillage({ layoutMode: 'compact' });

  return (
    <View style={[styles.container, { height }, isCompactPreview && styles.compactContainer]}>
      <VillageBackground
        skyGradient={timeTheme.skyGradient}
        groundColor={timeTheme.groundColor}
        starOpacity={timeTheme.starOpacity}
        allowOverflow={isCompactPreview}
      >
        {/* 마을 간판 — 미니뷰(광장)에서는 숨김 (캐릭터 가림 방지) */}
        {height >= VILLAGE_HEIGHT && (
          <VillageSignBoard
            greeting={timeTheme.greeting}
            label={timeTheme.label}
            villageName={t('village.title')}
          />
        )}

        {/* 동물의숲 장식: 나무 */}
        <VillageTree x={80} size="md" />
        <VillageTree x={92} size="sm" />
        <VillageTree x={5} size="sm" />

        {/* 동물의숲 장식: 꽃 */}
        <VillageFlower x={15} y={26} color="🌸" />
        <VillageFlower x={45} y={24} color="🌼" />
        <VillageFlower x={70} y={27} color="🌷" />
        <VillageFlower x={88} y={25} color="🌻" />
        <VillageFlower x={30} y={22} color="🌿" />

        {/* 구루 NPC들 (걸어다니는 캐릭터) */}
        <View style={styles.guruLayer}>
          {positions.map((pos) => (
            <WanderingGuru
              key={pos.guruId}
              position={pos}
              onPress={openGuruChat}
              villageHeight={height}
            />
          ))}
        </View>

        {/* 하단 라운드테이블 버튼 */}
        {onRoundtablePress && (
          <TouchableOpacity
            style={styles.roundtableBtn}
            onPress={onRoundtablePress}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles" size={14} color="#F0C060" />
            <Text style={styles.roundtableBtnText}>{t('roundtable.title')}</Text>
          </TouchableOpacity>
        )}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <View style={styles.loadingBadge}>
            <Text style={styles.loadingText}>{t('village.loading')}</Text>
          </View>
        )}
      </VillageBackground>

      {/* 구루 1:1 대화 모달 */}
      <GuruChatModal
        visible={userChatGuru !== null}
        guruId={userChatGuru}
        messages={userChatMessages}
        isLoading={isUserChatLoading}
        hasError={userChatError}
        onSend={sendMessageToGuru}
        onRetry={retryLastMessage}
        onClose={closeGuruChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
    // 동물의숲 카드 테두리 (나무 울타리 느낌)
    borderWidth: 2,
    borderColor: '#2A405830',
  },
  compactContainer: {
    overflow: 'visible',
    zIndex: 30,
  },
  guruLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  roundtableBtn: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2E3EE0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0C06030',
    zIndex: 2,
  },
  roundtableBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F0C060',
  },
  loadingBadge: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: '#0D1B2AE0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 20,
  },
  loadingText: {
    fontSize: 12,
    color: '#B8C4D0',
  },
});
