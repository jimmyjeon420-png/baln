# Jest 테스트 인프라 구축 완료

## 생성된 파일 목록

### 설정 파일
1. **jest.config.js** - Jest 메인 설정 파일
   - 위치: `/Users/nicenoodle/smart-rebalancer/jest.config.js`
   - 역할: Jest 테스트 실행 환경을 설정합니다 (회사의 "테스트 규칙서")
   - 주요 설정:
     - `preset: 'jest-expo'`: Expo 앱을 위한 Jest 설정 사용
     - `testMatch`: `__tests__` 폴더 내 `.test.ts(x)` 파일을 테스트로 인식
     - `collectCoverageFrom`: 커버리지 수집 대상 (src 폴더 내 모든 .ts/.tsx 파일)
     - `transformIgnorePatterns`: React Native 모듈들을 변환 대상에 포함

2. **jest.setup.js** - Jest 초기화 및 Mock 설정
   - 위치: `/Users/nicenoodle/smart-rebalancer/jest.setup.js`
   - 역할: 모든 테스트 실행 전 공통 설정을 수행합니다 (회사의 "오프닝 절차")
   - Mock 설정 목록:
     - React Native Animated
     - Expo Constants (환경 변수)
     - Expo Secure Store (안전한 저장소)
     - AsyncStorage (로컬 저장소)
     - Supabase (데이터베이스)
     - Gemini AI (AI 모델)

### 테스트 디렉토리 구조
```
src/
├── utils/
│   └── __tests__/          ← 유틸리티 함수 테스트
│       ├── formatters.test.ts (샘플 테스트 생성됨)
│       └── taxCalculator.test.ts (기존 파일)
└── services/
    └── __tests__/          ← 서비스 함수 테스트
        └── creditService.test.ts (샘플 테스트 생성됨)
```

## 샘플 테스트 파일

### 1. src/utils/__tests__/formatters.test.ts
- **목적**: 크레딧 포맷팅 함수 테스트
- **테스트 내용**:
  - `formatCredit()`: 크레딧 금액을 "10C" 형태로 포맷
  - `formatCreditWithKRW()`: 크레딧과 원화를 함께 표시 "10C (₩1,000)"
- **비즈니스 의미**: 사용자에게 크레딧 가치를 명확하게 보여주는 기능 검증

### 2. src/services/__tests__/creditService.test.ts
- **목적**: 크레딧 서비스 기능 테스트 (TODO 템플릿)
- **예정된 테스트**:
  - 크레딧 획득/사용
  - 잔액 조회
  - 트랜잭션 히스토리
  - 잔액 검증
- **비즈니스 의미**: 크레딧 경제 시스템의 핵심 로직 검증

## 테스트 실행 방법

### 전체 테스트 실행
```bash
cd /Users/nicenoodle/smart-rebalancer
npm test
```

### 특정 파일 테스트
```bash
npm test formatters.test.ts
```

### 커버리지 리포트 생성
```bash
npm test -- --coverage
```

### Watch 모드 (파일 변경 감지)
```bash
npm test -- --watch
```

## 필수 패키지 설치 여부 확인

### 현재 설치된 패키지
- ✅ jest (29.7.0) - package.json devDependencies에 포함

### 추가 설치가 필요한 패키지
다음 명령어로 설치하세요:
```bash
cd /Users/nicenoodle/smart-rebalancer
npx expo install jest-expo @testing-library/react-native @testing-library/jest-native
```

**왜 필요한가?**
- `jest-expo`: Expo 환경에 최적화된 Jest 설정 제공
- `@testing-library/react-native`: React Native 컴포넌트 테스트 유틸리티
- `@testing-library/jest-native`: React Native용 추가 매처 (toBeVisible, toHaveStyle 등)

## 다음 단계 (Task #10, #11, #12)

### Task #10: rebalanceCalculator 테스트 작성
**파일 생성**: `src/utils/__tests__/rebalanceCalculator.test.ts`
**테스트 내용**:
- 리밸런싱 필요 금액 계산
- 목표 비율 달성 검증
- 엣지 케이스 (0원, 음수, 극단 비율)

### Task #11: taxCalculator 테스트 작성
**파일**: `src/utils/__tests__/taxCalculator.test.ts` (이미 존재)
**검증 사항**:
- 기존 테스트가 잘 작동하는지 확인
- 추가 케이스 필요 시 보완

### Task #12: gemini 가격 보정 로직 테스트 작성
**파일 생성**: `src/services/__tests__/gemini.test.ts`
**테스트 내용**:
- AI 응답 파싱
- 가격 보정 로직
- 에러 처리 (API 실패, 잘못된 응답 등)

## 비개발자를 위한 설명

### 테스트 인프라란?
건물에 비유하면:
- **테스트 코드** = 건물 안전 점검 도구
- **jest.config.js** = 점검 규칙서 (어디를 어떻게 점검할지)
- **jest.setup.js** = 점검 준비 절차 (점검 도구 세팅, 가짜 부품 준비)
- **__tests__ 폴더** = 점검 보고서 보관소

### 왜 필요한가?
1. **버그 조기 발견**: 출시 전에 계산 오류, 로직 오류를 잡아냅니다
2. **리팩토링 안전망**: 코드를 개선할 때 기존 기능이 깨지지 않았는지 자동 확인
3. **문서화 효과**: 테스트 코드 자체가 "이 함수는 이렇게 동작해야 한다"는 명세서 역할

### 예시: formatCreditWithKRW 테스트
```typescript
// 사용자가 10 크레딧을 가지고 있을 때
// 앱은 "10C (₩1,000)"이라고 보여줘야 한다
expect(formatCreditWithKRW(10)).toBe('10C (₩1,000)');

// 만약 개발자가 실수로 환율을 1C = ₩10으로 바꾸면
// 이 테스트가 실패하며 "버그 발견!"이라고 알려줍니다
```

## 주의사항

### 병렬 작업 규칙 (CLAUDE.md 7-2 참조)
- **jest.config.js**: 한 Claude만 수정 (높은 위험도)
- **jest.setup.js**: 한 Claude만 수정 (높은 위험도)
- **개별 테스트 파일**: 각 파일은 독립적이므로 자유롭게 작성 가능

### 테스트 작성 원칙
1. **독립성**: 각 테스트는 다른 테스트에 영향을 주지 않아야 함
2. **명확성**: 테스트 이름만 봐도 무엇을 검증하는지 알 수 있어야 함
3. **완전성**: 정상 케이스 + 에러 케이스 모두 테스트

## 출시 전 체크리스트

- [x] jest.config.js 생성
- [x] jest.setup.js 생성
- [x] src/utils/__tests__/ 디렉토리 생성
- [x] src/services/__tests__/ 디렉토리 생성
- [x] 샘플 테스트 파일 생성
- [ ] jest-expo 패키지 설치
- [ ] 테스트 실행 확인 (`npm test`)
- [ ] Task #10, #11, #12 테스트 작성 완료
- [ ] 전체 테스트 통과 확인

## 문의사항

테스트 인프라 관련 질문이 있으면 이 문서와 함께 다음을 참고하세요:
- Jest 공식 문서: https://jestjs.io/
- Expo Testing 가이드: https://docs.expo.dev/develop/unit-testing/
- React Native Testing Library: https://callstack.github.io/react-native-testing-library/
