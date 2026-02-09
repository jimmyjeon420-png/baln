# Profile 담당자님께 요청: 투자 예측 게임 메뉴 추가

> **요청자:** Instance 5 (예측 게임 담당)
> **요청 파일:** `app/(tabs)/profile.tsx`
> **작업:** menuItems 배열에 투자 예측 게임 항목 추가

---

## 📋 요청 사항

`profile.tsx`의 `menuItems` 배열에 **투자 예측 게임** 메뉴를 추가해주세요.

### 추가할 코드

```typescript
// menuItems 배열 내부 (추천 위치: '오늘의 퀴즈' 바로 아래)
{
  icon: 'game-controller',
  label: '투자 예측',
  onPress: () => router.push('/games/predictions'),
  feature: true
}
```

### 상세 설명

| 속성 | 값 | 이유 |
|------|-----|------|
| **icon** | `'game-controller'` | 게임 느낌을 주는 Ionicons 아이콘 |
| **label** | `'투자 예측'` | 간결하고 명확한 한글 라벨 |
| **onPress** | `router.push('/games/predictions')` | 예측 게임 메인 화면으로 이동 |
| **feature** | `true` | AI 배지 표시 (초록색 강조) |

### 권장 위치

```typescript
const menuItems = [
  { icon: 'diamond', label: '크레딧 충전', onPress: () => router.push('/marketplace/credits'), credit: true },
  { icon: 'home-outline', label: '부동산 자산 추가', onPress: () => router.push('/add-realestate'), feature: true },
  { icon: 'heart', label: 'Heart 자산 관리', onPress: () => router.push('/settings/manage-hearts'), feature: true },
  { icon: 'trophy-outline', label: '투자 레벨', onPress: () => router.push('/settings/investor-level'), highlight: true },
  { icon: 'help-outline', label: '오늘의 퀴즈', onPress: () => router.push('/settings/daily-quiz'), feature: true },

  // ✨ 여기에 추가 ✨
  { icon: 'game-controller', label: '투자 예측', onPress: () => router.push('/games/predictions'), feature: true },

  { icon: 'person-outline', label: '프로필 설정', onPress: () => router.push('/settings/profile') },
  // ... 나머지 메뉴들
];
```

---

## 🎨 UI 미리보기

추가 시 다음과 같이 표시됩니다:

```
┌─────────────────────────────────────────┐
│ 🎮  투자 예측                      AI ▶ │
└─────────────────────────────────────────┘
```

- **아이콘:** 🎮 (게임 컨트롤러)
- **라벨:** 투자 예측 (초록색)
- **배지:** AI (초록 배경, 검은 글씨)
- **우측 화살표:** `chevron-forward`

---

## ✅ 체크리스트

추가 시 다음을 확인해주세요:

- [ ] `menuItems` 배열에 항목 추가
- [ ] `feature: true` 속성으로 초록색 스타일 적용
- [ ] 라우팅 경로 확인: `/games/predictions` (이미 존재)
- [ ] 빌드 에러 없는지 확인

---

## 📌 참고 정보

### 예측 게임 화면 위치
```
app/games/predictions.tsx  ← 이미 완성됨 ✅
```

### 화면 기능
- ✅ 오늘의 예측 투표 (YES/NO)
- ✅ 어제의 결과 복기 (적중률 통계)
- ✅ 주간 리더보드 (상위 10명)
- ✅ 내 통계 (총 투표, 적중률, 연속 적중, 크레딧)
- ✅ 카테고리 필터 (주식/코인/거시경제/이벤트)
- ✅ 보상 시스템 (적중 2C, 5연속 +3C, 10연속 +10C)

### 비즈니스 로직 (MEMORY.md 발췌)
```
- MAU 게임형 인게이지먼트: 매일 3개 예측 질문 → YES/NO 투표
- 보상: 적중 2C(구독자 4C), 5연속 +3, 10연속 +10, 투표 무료
- 카테고리: stocks/crypto/macro/event + 필터 칩
- 리더보드: 최소 5회 투표 유저, accuracy_rate DESC
```

---

## 🚀 우선순위

**P1 (High Priority)** - 습관 루프의 핵심 진입점

CLAUDE.md의 1차 GOAL에 따르면:
> "**습관 루프**: 맥락 읽기→예측 투표→복기→스트릭→패닉셀 방지"

투자 예측 게임은 사용자가 **매일 앱에 접속하는 이유**를 제공하는 핵심 기능입니다. 빠른 추가를 권장합니다.

---

## 💬 문의 사항

궁금한 점이 있으면 Instance 5 (예측 게임 담당)에게 문의해주세요.

**감사합니다!** 🙏
