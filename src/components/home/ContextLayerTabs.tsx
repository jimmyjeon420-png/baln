/**
 * ContextLayerTabs - 맥락 카드 4겹 레이어 탭 컴포넌트
 *
 * 역할: 역사/거시/기관/내자산 4개 레이어를 탭으로 전환
 * 비유: 탭바처럼 레이어를 스와이프하며 볼 수 있는 네비게이션
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/** 레이어 타입 */
export type ContextLayer = 'historical' | 'macro' | 'institution' | 'portfolio';

/** 레이어 정의 */
const LAYERS: Array<{
  id: ContextLayer;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  shortLabel: string; // 작은 화면용
  color: string;
}> = [
  {
    id: 'historical',
    icon: 'time-outline',
    label: '역사적 맥락',
    shortLabel: '역사',
    color: '#4CAF50', // 초록
  },
  {
    id: 'macro',
    icon: 'git-network-outline',
    label: '거시경제',
    shortLabel: '거시',
    color: '#2196F3', // 파랑
  },
  {
    id: 'institution',
    icon: 'business-outline',
    label: '기관 행동',
    shortLabel: '기관',
    color: '#FF9800', // 주황
  },
  {
    id: 'portfolio',
    icon: 'trending-up-outline',
    label: '내 자산',
    shortLabel: '내 자산',
    color: '#9C27B0', // 보라
  },
];

interface ContextLayerTabsProps {
  /** 현재 활성 레이어 */
  activeLayer: ContextLayer;
  /** 레이어 변경 핸들러 */
  onLayerChange: (layer: ContextLayer) => void;
  /** 레이어별 잠금 상태 (Premium 전용) */
  lockedLayers?: ContextLayer[];
  /** Premium 구매 버튼 클릭 */
  onPressPremium?: () => void;
}

/**
 * 맥락 카드 레이어 탭 컴포넌트
 *
 * @example
 * ```tsx
 * const [activeLayer, setActiveLayer] = useState<ContextLayer>('historical');
 *
 * <ContextLayerTabs
 *   activeLayer={activeLayer}
 *   onLayerChange={setActiveLayer}
 *   lockedLayers={['institution', 'portfolio']}
 *   onPressPremium={() => router.push('/subscription')}
 * />
 * ```
 */
export function ContextLayerTabs({
  activeLayer,
  onLayerChange,
  lockedLayers = [],
  onPressPremium,
}: ContextLayerTabsProps) {
  // 언더라인 애니메이션
  const activeIndex = LAYERS.findIndex(l => l.id === activeLayer);
  const underlinePosition = useSharedValue(activeIndex * 25); // 25% 간격

  React.useEffect(() => {
    underlinePosition.value = withSpring(activeIndex * 25, {
      damping: 20,
      stiffness: 200,
    });
  }, [activeIndex]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlinePosition.value }],
  }));

  return (
    <View className="border-b border-gray-200 dark:border-gray-700">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-row justify-around w-full">
          {LAYERS.map((layer, index) => {
            const isActive = layer.id === activeLayer;
            const isLocked = lockedLayers.includes(layer.id);

            return (
              <TouchableOpacity
                key={layer.id}
                onPress={() => {
                  if (isLocked && onPressPremium) {
                    onPressPremium();
                  } else {
                    onLayerChange(layer.id);
                  }
                }}
                className={`flex-1 items-center pb-3 pt-2 px-2 ${isActive ? 'border-b-2' : ''}`}
                style={isActive ? { borderBottomColor: layer.color } : undefined}
                activeOpacity={0.7}
              >
                {/* 아이콘 */}
                <View className="relative">
                  <Ionicons
                    name={layer.icon}
                    size={20}
                    color={isActive ? layer.color : '#9E9E9E'}
                  />
                  {isLocked && (
                    <View className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-3 h-3 items-center justify-center">
                      <Ionicons name="lock-closed" size={8} color="#FFF" />
                    </View>
                  )}
                </View>

                {/* 라벨 */}
                <Text
                  className={`text-xs text-center mt-1 ${
                    isActive
                      ? 'font-bold'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                  style={isActive ? { color: layer.color } : undefined}
                >
                  {layer.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 언더라인 애니메이션 (대체 방식) */}
        {/* <Animated.View
          className="absolute bottom-0 h-0.5 w-1/4"
          style={[
            { backgroundColor: LAYERS[activeIndex].color },
            underlineStyle,
          ]}
        /> */}
      </ScrollView>
    </View>
  );
}

/**
 * 기본 export (호환성)
 */
export default ContextLayerTabs;
