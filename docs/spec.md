# baln Spec (Agent Source of Truth)

> 이 파일은 에이전트가 "무엇을 만들어야 하는지" 판단하는 기준입니다.
> CLAUDE.md의 핵심만 추출한 것입니다. 여기에 없는 것은 만들지 않습니다.

## Mission

매일 5분, 시장 맥락을 읽으며 "자기만의 투자 기준"을 형성하게 돕는 습관 앱.
"안심을 판다, 불안을 팔지 않는다."

## Target User

20~40대, 약 5,000만원 모은 투자 입문자.
시장 급락 시 패닉셀, 급등 시 FOMO 매수하는 사람.

## Core Loop (Habit Loop)

```
맥락 카드 읽기 → 예측 투표 → 복기 & 정답 확인 → 자기 기준 형성 → 패닉셀 방지
```

## 5-Tab Structure

| Tab | Name | File | Role |
|-----|------|------|------|
| 1 | Today | `app/(tabs)/index.tsx` | Context card + Prediction + Pulse |
| 2 | Checkup | `app/(tabs)/rebalance.tsx` | AI diagnosis + Prescription |
| 3 | Village | `app/(tabs)/village.tsx` | Guru village + Roundtable |
| 4 | Lounge | `app/(tabs)/lounge.tsx` | Community |
| 5 | More | `app/(tabs)/profile.tsx` | Settings + Credits + Market |

## Supported Locales

- Korean (ko) = KRW (Won)
- English (en) = USD ($)
- Japanese (ja) = JPY (Yen)

All user-visible text must use `t()` from `useLocale()`.
All currency must use `getCurrencySymbol()` from `formatters.ts`.

## Non-Goals (DO NOT build)

- Real-time stock trading / order execution
- Financial advice (we provide context, not recommendations)
- Social features beyond community posts
- Android (iOS only for now)

## Hard Constraints

- TypeScript: `tsc --noEmit` must be 0 errors at all times
- ESLint: `--max-warnings=0` on all staged files
- Tests: all existing tests must pass
- No `eas build` cloud builds (local only)
- No `git push --force`
- No breaking changes to shared types without opt-in

## Revenue Model

- Free: summary context card, 1 AI diagnosis/day, 3 predictions/day
- Premium: full 4-layer context, 3 AI diagnoses, prediction insights
- Credits: 1C = 100 KRW

## Tech Stack

- React Native + Expo SDK 54
- TypeScript
- Supabase (DB + Auth + Edge Functions)
- TanStack Query
- Google Gemini API (AI analysis)
- Sentry (error tracking)
- i18n-js (localization)
