# 통합 테스트 체크리스트 (Phase 1-2 완료 후)

> 생성일: 2026-02-09
> 목적: c2, c3, c4, c5 작업 완료 후 전체 앱 통합 검증

---

## ✅ Instance 2 (분석 탭) 검증

### What-if 시뮬레이터 UX
- [ ] 슬라이더 조작 시 건강 점수 실시간 변화 확인
- [ ] "추천 조정" 버튼 동작 확인 (최적 비중 자동 설정)
- [ ] 건강 점수 시각화 차트 렌더링 확인
- [ ] AI 분석 버튼 클릭 → marketplace 이동 확인 (3크레딧 차감)
- [ ] 조정값 초기화 버튼 동작 확인

### 건강 점수 섹션
- [ ] 6팩터 상세 설명 툴팁 표시 확인
- [ ] 펼침/접힘 애니메이션 부드러움 확인
- [ ] 팩터별 차트 렌더링 확인
- [ ] 등급별 색상 일관성 확인 (S/A/B/C/D)

### 크로스 탭 연동
- [ ] rebalance.tsx 변경사항이 index.tsx(오늘 탭)의 Pulse 카드에 반영되는지 확인
- [ ] useSharedAnalysis 캐시 히트 확인 (탭 전환 시 0ms)

---

## ✅ Instance 3 (커뮤니티) 검증

### 성능 최적화
- [ ] 무한스크롤 5개씩 로딩 확인 (기존 10개 → 5개)
- [ ] FlatList 스크롤 부드러움 확인 (60fps 유지)
- [ ] 새로고침 시 중복 데이터 없는지 확인

### 이미지 업로드
- [ ] 카메라/갤러리 권한 요청 확인
- [ ] 이미지 선택 후 미리보기 표시 확인
- [ ] Supabase Storage 업로드 확인 (파일명: `{userId}_{timestamp}.jpg`)
- [ ] 업로드 실패 시 에러 토스트 확인
- [ ] 이미지 URL이 post.image_url에 저장되는지 확인

### 댓글 가상화
- [ ] 댓글 100개 이상인 게시물에서 VirtualizedList 동작 확인
- [ ] 스크롤 성능 확인 (lag 없어야 함)
- [ ] 댓글 좋아요 토글 확인

### 관리자 신고 처리
- [ ] `/admin/reports` 화면 접근 확인 (ADMIN 권한만)
- [ ] 신고 목록 표시 확인 (게시물/댓글 구분)
- [ ] "삭제" 버튼 클릭 → 콘텐츠 삭제 + 신고 상태 변경 확인
- [ ] "무시" 버튼 클릭 → 신고 상태만 변경 확인

### 크로스 탭 연동
- [ ] profile.tsx의 "커뮤니티 프리뷰"와 community/index.tsx 데이터 일치 확인
- [ ] 게시물 작성 후 즉시 피드에 반영되는지 확인

---

## ✅ Instance 4 (백엔드) 검증

### Edge Function 배포
- [ ] Supabase Dashboard에서 `daily-briefing` 함수 확인
- [ ] 수동 실행 테스트 (Invoke 버튼)
- [ ] Logs 탭에서 7개 Task 성공 로그 확인:
  - `[Task A] Macro analysis completed`
  - `[Task B] Stock quant completed (35 stocks)`
  - `[Task C] Guru insights completed (10 gurus)`
  - `[Task D] Snapshots & brackets completed`
  - `[Task E] Predictions generated`
  - `[Task E-Resolve] Predictions resolved`
  - `[Task F] Real estate prices updated (or skipped)`
  - `[Task G] Context cards generated`

### Cron 스케줄
- [ ] Supabase Dashboard → Edge Functions → Cron Jobs 확인
- [ ] 매일 07:00 KST 실행 설정 확인 (`0 22 * * *` UTC)
- [ ] 첫 실행 후 DB 데이터 확인:
  - `daily_market_insights` 테이블에 오늘 날짜 row 생성
  - `stock_quant_reports` 테이블에 35개 종목 row 생성
  - `guru_insights` 테이블에 10명 인사이트 생성
  - `prediction_polls` 테이블에 3개 질문 생성

### 모니터링
- [ ] Edge Function 실행 시간 확인 (< 60초)
- [ ] Gemini API 호출 횟수 확인 (Task별 제한 준수)
- [ ] 에러 발생 시 Slack/Email 알림 설정 확인 (optional)

---

## ✅ Instance 5 (예측 게임) 검증

### 리더보드 UI
- [ ] 상위 10명 표시 확인
- [ ] 내 순위 하이라이트 확인
- [ ] 최소 5회 투표 유저만 표시 확인
- [ ] 정확도(%) 내림차순 정렬 확인

### 통계 차트
- [ ] 승률 파이 차트 렌더링 확인 (react-native-svg)
- [ ] 카테고리별 정확도 막대 차트 확인
- [ ] 연속 적중 스트릭 그래프 확인

### 소셜 공유
- [ ] "결과 공유하기" 버튼 확인
- [ ] 공유 카드 생성 확인 (react-native-view-shot)
- [ ] 인스타그램 공유 확인 (expo-sharing)
- [ ] 공유 성공 시 "+3크레딧" 보상 확인 (1일 1회)

### 크로스 탭 연동
- [ ] index.tsx(오늘 탭)의 "예측 미리보기"와 게임 화면 데이터 일치 확인
- [ ] 투표 완료 후 index.tsx에 "투표 완료" 상태 반영 확인

---

## 🔄 전체 앱 통합 검증

### 3탭 구조
- [ ] 탭 전환 시 화면 전환 부드러움 확인 (< 100ms)
- [ ] TabBar 아이콘/라벨 일관성 확인
- [ ] 각 탭의 헤더 높이 일치 확인

### 공유 훅 캐시
- [ ] useSharedPortfolio 캐시 히트 확인 (staleTime 3분)
- [ ] useSharedAnalysis 캐시 히트 확인 (staleTime 5분)
- [ ] useSharedBitcoin 캐시 히트 확인 (staleTime 5분)
- [ ] 탭 전환 시 불필요한 API 호출 없는지 Network 탭 확인

### 크레딧 시스템
- [ ] AI 기능 사용 시 크레딧 차감 확인
- [ ] 잔액 부족 시 충전 화면 이동 확인
- [ ] 티어별 할인 적용 확인 (GOLD 10% / PLATINUM 20% / DIAMOND 30%)

### 알림 시스템
- [ ] 위기 감지 푸시알림 확인 (시장 -3% 이상)
- [ ] 하루 1회 제한 확인 (AsyncStorage)
- [ ] 알림 클릭 시 맥락 카드 화면 이동 확인

### 스트릭 시스템
- [ ] 연속 방문 기록 확인
- [ ] index.tsx StreakBanner 표시 확인
- [ ] 방문 중단 시 스트릭 리셋 확인

### Toast 시스템
- [ ] 성공 토스트 (초록색) 표시 확인
- [ ] 에러 토스트 (빨간색) 표시 확인
- [ ] 정보 토스트 (파란색) 표시 확인
- [ ] 여러 토스트 동시 표시 시 큐 동작 확인

### 오프라인 모드
- [ ] 네트워크 끊김 시 OfflineBanner 표시 확인
- [ ] 재연결 시 자동 숨김 확인
- [ ] TanStack Query 재시도 로직 동작 확인

---

## 🐛 알려진 이슈 & 회귀 테스트

### TypeScript 타입 에러 (Instance 1에서 수정 완료)
- [ ] 빌드 시 타입 에러 없는지 확인 (`npm run tsc`)
- [ ] 런타임 에러 없는지 확인 (Metro 로그)

### 부동산 자산 (Phase 1-2에서 추가)
- [ ] RE_ 티커가 Gemini 분석에서 제외되는지 확인
- [ ] 부동산 자산이 portfolioAssets에서 분리되는지 확인
- [ ] 총자산 계산에 부동산 포함 확인

### 커뮤니티 금지어 필터 (Instance 3에서 추가)
- [ ] 55개 금지어 입력 시 경고 메시지 확인
- [ ] 게시물/댓글 작성 차단 확인

---

## 📊 성능 벤치마크

| 항목 | 목표 | 현재 | 상태 |
|------|------|------|------|
| 앱 시작 시간 | < 3초 | - | ⏳ |
| 탭 전환 시간 | < 100ms | - | ⏳ |
| API 응답 시간 (DB) | < 200ms | - | ⏳ |
| API 응답 시간 (Gemini) | < 8초 | - | ⏳ |
| 무한스크롤 FPS | 60fps | - | ⏳ |
| 이미지 업로드 시간 | < 5초 | - | ⏳ |

---

## ✅ 최종 승인 기준

아래 모든 항목이 체크되어야 배포 승인:

- [ ] 모든 TypeScript 타입 에러 해결
- [ ] 모든 런타임 에러 해결
- [ ] 3탭 모두 정상 동작
- [ ] 크레딧 시스템 정상 동작 (차감/충전/환불)
- [ ] Edge Function Cron 정상 실행 (최소 3일 연속)
- [ ] 성능 벤치마크 모두 목표치 달성
- [ ] 알려진 이슈 0건

---

**다음 단계**: c2, c3, c4, c5 작업 완료 후 이 체크리스트를 순차적으로 검증하고, 발견된 이슈는 즉시 해당 인스턴스에 피드백.
