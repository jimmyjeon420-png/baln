# ShareCard 컴포넌트 - 사용 가이드

## 역할
투자 예측 적중률을 인스타그램/소셜 미디어에 공유할 수 있는 시각적으로 매력적인 카드입니다.

## 기능
1. **그라데이션 배경**: #4CAF50 → #2196F3 (초록 → 파랑)
2. **대형 적중률 표시**: 96pt 폰트로 사용자의 적중률 강조
3. **통계 요약**: 총 투표 수, 연속 적중 횟수
4. **PNG 캡처**: react-native-view-shot로 1080x1080 인스타그램 정사각형
5. **네이티브 공유**: expo-sharing으로 iOS/Android Share Sheet

## Props
```typescript
interface ShareCardProps {
  accuracyRate: number;      // 적중률 (0-100)
  totalVotes: number;        // 총 투표 수
  currentStreak: number;     // 연속 적중 횟수
  onShare?: () => void;      // 공유 완료 콜백 (선택)
}
```

## 사용 예시

### predictions.tsx에서 사용
```tsx
import ShareCard from '../../src/components/predictions/ShareCard';

// MyStatsSection 아래에 배치
{myStats && myStats.total_votes >= 5 && (
  <ShareCard
    accuracyRate={Number(myStats.accuracy_rate.toFixed(0))}
    totalVotes={myStats.total_votes}
    currentStreak={myStats.current_streak}
    onShare={() => {
      console.log('공유 완료');
      // 향후: 공유 보상 지급 (3크레딧)
    }}
  />
)}
```

## 사용자 플로우
1. **진행중 탭**: 내 통계 카드 아래 "인스타그램 공유" 버튼 표시
2. **조건**: 최소 5회 이상 투표한 사용자만 버튼 활성화
3. **버튼 클릭**: 모달 열림 → 공유 카드 프리뷰
4. **공유하기**: PNG 캡처 → Share Sheet → 인스타그램/카카오톡/기타 앱
5. **완료**: 모달 닫힘 + 성공 메시지

## 디자인 사양

### 카드 크기
- **화면 프리뷰**: 최대 400px (화면 크기 대응)
- **캡처 해상도**: 1080x1080px (인스타그램 표준)

### 색상
- **그라데이션**: #4CAF50 → #2196F3 (45도 대각선)
- **텍스트**: #FFFFFF (흰색)
- **워터마크**: baln.app | baln.logic

### 레이아웃 (상→하)
1. **헤더**: baln 로고 (32pt) + .logic (28pt)
2. **중앙**:
   - "내 투자 예측 적중률" 타이틀 (20pt)
   - 적중률 대형 숫자 (96pt) + % 기호 (48pt)
   - 통계 그리드: 총 투표 | 연속 적중
3. **푸터**: baln.app | baln.logic 워터마크

### 공유 버튼
- **배경**: 그라데이션 (#4CAF50 → #2196F3)
- **아이콘**: share-social-outline (20px)
- **텍스트**: "인스타그램 공유" (15pt, 볼드)

### 모달 실행 버튼
- **배경**: #E1306C (인스타그램 핑크)
- **아이콘**: logo-instagram (24px)
- **텍스트**: "공유하기" (16pt, 볼드)

## 의존성
```json
{
  "expo-linear-gradient": "~14.0.2",  // 이미 설치됨
  "react-native-view-shot": "3.8.0",  // 이미 설치됨
  "expo-sharing": "~13.0.0"           // 이미 설치됨
}
```

## 브랜딩
- **메인 브랜드**: baln (발른)
- **서브 브랜드**: baln.logic (AI 분석/공유 카드)
- **워터마크**: baln (흰색) + .logic (초록색 #4CAF50)

## 접근성
- **최소 투표 요구**: 5회 (적중률 의미 있는 수준)
- **로딩 인디케이터**: 캡처 중 스피너 표시
- **에러 처리**: Alert로 사용자에게 명확한 피드백
- **기기 호환성**: iOS/Android 네이티브 Share 지원

## 향후 확장 계획
1. **공유 보상**: 하루 1회 공유 시 +3 크레딧 지급
2. **다크 테마**: 사용자 설정에 따라 배경색 변경
3. **커스터마이징**: 사용자가 배경 그라데이션 선택 가능
4. **리더보드 공유**: 순위와 함께 공유 (TOP 10 진입 시)
5. **SNS 직접 연동**: 인스타그램 스토리 API 직접 연동 (향후)

## 주의사항
- **권한**: iOS에서 처음 공유 시 사진 접근 권한 요청
- **파일 크기**: 1080x1080 PNG는 약 500KB ~ 1MB
- **캐시**: 캡처된 이미지는 임시 폴더에 저장, 앱 종료 시 자동 삭제
- **성능**: ViewShot 캡처는 약 0.5~1초 소요 (로딩 표시 필수)

## 테스트 체크리스트
- [ ] 버튼이 5회 미만 투표 시 disabled 상태
- [ ] 버튼 클릭 시 모달 열림
- [ ] 공유 카드 1080x1080 정확히 캡처
- [ ] iOS Share Sheet 정상 작동
- [ ] Android Share Sheet 정상 작동
- [ ] 공유 완료 후 모달 닫힘
- [ ] 에러 발생 시 Alert 표시
- [ ] onShare 콜백 정상 호출
- [ ] 적중률 0%, 100% 극단값 테스트
- [ ] 연속 적중 0회, 50회 이상 테스트

## 참고 파일
- `app/games/predictions.tsx`: 메인 통합 위치
- `src/hooks/usePredictions.ts`: 데이터 훅
- `src/types/prediction.ts`: 타입 정의
- `src/components/home/ContextShareCard.tsx`: 맥락 카드 공유 (유사 패턴)
