# Stability Gate

이 문서는 비개발자도 앱의 현재 안정성을 빠르게 확인할 수 있게 만든 운영 문서다.

## 목적

앱에서 문제가 생길 때마다 케이스별로 땜질하지 않고, 배포 전 핵심 경로를 자동으로 점검한다.

현재 자동 점검기는 아래 항목을 막는다.

- 실서비스 Supabase/Gemini 프리플라이트 실패
- 실서비스 뉴스/맥락 카드 콘텐츠 정체
- 실서비스 자동복구(healer) 상태 점검 실패
- 타입 오류
- `@ts-nocheck` 증가
- 핵심 경로 린트 오류
- 핵심 계산 스모크 테스트 실패
- 핵심 사용자 동선 회귀 실패

## 실행 방법

프로젝트 루트에서 아래 명령만 실행하면 된다.

```bash
npm run qa:stability
```

실서비스 네트워크 체크만 잠시 건너뛰고 싶으면 아래처럼 실행할 수 있다.

```bash
BALN_SKIP_NETWORK_CHECKS=1 npm run qa:stability
```

## 결과 확인

실행 후 아래 리포트가 자동 생성된다.

- `/Users/nicenoodle/baln/reports/stability/latest.md`
- `/Users/nicenoodle/baln/reports/stability/latest.json`
- `/Users/nicenoodle/baln/reports/operations/latest.md`
- `/Users/nicenoodle/baln/reports/operations/latest.json`

`latest.md`는 사람이 읽기 쉬운 요약 리포트다.

## PASS / FAIL 해석

- `PASS`: 현재 배포 전 필수 점검 항목이 모두 통과
- `FAIL`: 실제 사용자 기능에 영향을 줄 수 있는 블로킹 문제가 있음

## 지금 포함된 자동 점검

1. 실서비스 프리플라이트
2. 실서비스 콘텐츠 신선도
3. 운영 힐러 상태 점검
3. TypeScript 타입 체크
4. `ts-nocheck` 증가 방지
5. 핵심 경로 린트
6. 핵심 계산 스모크 테스트
7. 핵심 사용자 동선 회귀 테스트
8. Release Gate

## 핵심 사용자 동선 회귀 범위

현재 자동 점검에 포함된 핵심 사용자 동선은 아래와 같다.

- OCR 파싱
- 주식/코인 티커 매핑
- 포트폴리오 자산 저장
- Gemini 프록시 호출 및 재시도

## 실서비스 콘텐츠 신선도 기준

운영 데이터가 멈췄는데도 앱 빌드는 통과하는 상황을 막기 위해 아래 항목을 자동 감시한다.

- 주식 뉴스 최신 기사 시각
- 암호화폐 뉴스 최신 기사 시각
- 거시경제 뉴스 최신 기사 시각
- 맥락 카드 최신 생성 시각
- 예측 콘텐츠 최신 생성 시각

현재 기준:

- 뉴스 3개 카테고리: 90분 경과 시 경고, 6시간 경과 시 실패
- 맥락 카드: 6시간 경과 시 경고, 18시간 경과 시 실패
- 예측 콘텐츠: 24시간 경과 시 경고, 72시간 경과 시 경고성 점검

직접 실행:

```bash
npm run qa:content-freshness
```

## 운영 자동복구 구조

운영 데이터가 멈춰도 사람이 수동으로 붙지 않도록 3단계 자동복구로 운용한다.

1. `Operations Daily Main`
- 매일 KST 오전 7시대에 `daily-briefing` 핵심 Task를 분할 호출한다.
- 무거운 메인 배치 `A,B,C,D,E,F,H,I`를 한 번에 호출하지 않고 `D -> A -> B1 -> B2 -> C -> E -> F -> H -> I(월요일만)` 순서로 나눈다.
- 이유: 기존 일괄 호출은 `WORKER_LIMIT`로 실제 운영에서 멈췄다.

2. `Operations Healer`
- 15분마다 뉴스/맥락 카드/예측 콘텐츠 상태를 확인하고, stale 상태일 때만 가벼운 복구 호출을 한다.
- 무거운 메인 일일 배치는 힐러가 직접 호출하지 않는다.

3. `Operations Monitor`
- 1시간마다 신선도 리포트를 만들고, 블로킹 실패가 있으면 CI/배포 게이트에서 차단한다.

## Release Gate

TestFlight / App Store용 빌드는 안정성 게이트 위에 릴리스 게이트를 한 번 더 통과해야 한다.

```bash
npm run qa:release
```

릴리스 게이트는 아래를 차단한다.

- `qa:stability` 실패
- `eas.json` preview/production 빌드 프로필 누락
- 필수 운영 환경변수 누락
- `submit.production.ios` 누락 또는 App Store Connect API 키 파일 누락

EAS 빌드 환경에서는 `preview`, `production` 프로필일 때 `eas-build-post-install` 훅으로 자동 실행된다.

## 다음에 추가할 자동 점검

아래는 아직 수동 또는 별도 환경이 필요한 항목이다.

- TestFlight 실기기 스모크 테스트
- OCR 샘플 이미지 기반 통합 테스트
- 포트폴리오 진단/딥다이브 실환경 호출 검증
- 뉴스 이미지 로드 성공률 모니터링

## 운영 원칙

- 새 기능을 추가하면 반드시 회귀 테스트 1개 이상 같이 추가
- 사용자 장애가 난 기능은 같은 유형의 자동 테스트를 추가해서 재발을 막음
- 배포 전에는 `qa:stability`가 실패하면 배포하지 않음
- TestFlight / App Store 빌드 전에는 `qa:release`가 실패하면 빌드하지 않음
