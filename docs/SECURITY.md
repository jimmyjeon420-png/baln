# baln 보안 백서 (Security Whitepaper)

**작성일**: 2026-02-11
**버전**: 1.0
**목적**: 사용자 데이터 보호 방침 및 보안 아키텍처 설명

---

## 📋 목차

1. [보안 원칙](#보안-원칙)
2. [데이터 암호화](#데이터-암호화)
3. [API 키 관리](#api-키-관리)
4. [Supabase Row-Level Security (RLS)](#supabase-row-level-security-rls)
5. [인증 및 권한 관리](#인증-및-권한-관리)
6. [오픈뱅킹 API 연동 (계획)](#오픈뱅킹-api-연동-계획)
7. [로컬 데이터 저장](#로컬-데이터-저장)
8. [보안 인증 로드맵](#보안-인증-로드맵)
9. [취약점 보고](#취약점-보고)

---

## 보안 원칙

baln은 투자 습관 앱으로서 사용자의 금융 데이터를 다룹니다. 다음 3가지 원칙을 준수합니다:

1. **최소 권한 원칙** (Principle of Least Privilege)
   - 필요한 데이터만 수집합니다
   - 읽기 전용 권한만 요청합니다 (계좌 연동 시)
   - 출금/매매 권한은 **절대 요청하지 않습니다**

2. **암호화 우선** (Encryption First)
   - 전송 중 데이터: HTTPS/TLS 1.3
   - 저장 데이터: Supabase 자동 암호화
   - 민감 정보: AES-256 암호화 (계좌번호 등)

3. **투명성** (Transparency)
   - 보안 정책 공개 (이 문서)
   - 개인정보 처리방침 명시 ([baln.app/privacy](https://baln.app/privacy))
   - 취약점 보고 채널 운영

---

## 데이터 암호화

### 전송 중 암호화 (Data in Transit)

- **프로토콜**: HTTPS/TLS 1.3
- **적용 범위**:
  - Supabase API 통신
  - Gemini AI API 통신
  - 카카오/국토교통부 API 통신
- **인증서**: Let's Encrypt 자동 갱신

### 저장 데이터 암호화 (Data at Rest)

| 데이터 종류 | 저장 위치 | 암호화 방법 | 비고 |
|------------|----------|-----------|------|
| 자산 데이터 (Asset[]) | Supabase `assets` 테이블 | AES-256 (Supabase 기본) | 자산명, 수량, 가격 |
| 사용자 인증 정보 | Supabase Auth | bcrypt (비밀번호 해싱) | 이메일, 비밀번호 |
| 예측 투표 기록 | Supabase `prediction_votes` | AES-256 | 투표 내역 |
| 크레딧 잔액 | Supabase `user_credits` | AES-256 | 크레딧 거래 내역 |
| **계좌번호** (P2) | Supabase `bank_accounts` | **AES-256 + 별도 암호화 키** | 🔐 출시 후 구현 |

### 계좌번호 암호화 (P2 — 계좌 연동 시)

> **현재 상태**: 출시 시점에는 수동 입력만 지원. 계좌 연동 기능은 **MAU 500 + 평점 4.0+ 달성 후** 오픈 예정.

```typescript
// 계획된 암호화 방식 (출시 후 구현)
// 1. 사용자 입력 → 프론트엔드에서 계좌번호 수신
// 2. Edge Function으로 전달 (HTTPS)
// 3. Edge Function에서 AES-256 암호화 (환경변수 ENCRYPTION_KEY 사용)
// 4. 암호화된 값만 DB 저장
// 5. 조회 시 Edge Function에서 복호화 후 반환

// 암호화 키는 Supabase Vault에 저장 (DB와 분리)
```

**보안 조치**:
- 계좌번호는 **앱 로컬에 절대 저장하지 않음**
- Supabase Edge Function에서만 복호화
- 암호화 키는 환경변수로 관리 (코드에 하드코딩 금지)

---

## API 키 관리

### 환경변수 사용

모든 API 키는 환경변수로 관리하며, 소스 코드에 하드코딩하지 않습니다.

```bash
# .env 파일 (절대 git에 커밋 금지)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
EXPO_PUBLIC_KAKAO_REST_API_KEY=...
EXPO_PUBLIC_MOLIT_API_KEY=...
```

### API 키 종류 및 권한

| API 키 | 용도 | 권한 | 노출 위험 시 조치 |
|--------|------|------|-----------------|
| **Supabase Anon Key** | 클라이언트에서 DB 접근 | **읽기 전용** (RLS 정책으로 보호) | 키 재생성 + 앱 업데이트 |
| **Supabase Service Key** | Edge Function 전용 | 전체 권한 | **절대 클라이언트 노출 금지** |
| **Gemini API Key** | AI 분석 요청 | Google Gemini API 호출 | API 키 재발급 |
| **Kakao REST API** | 부동산 검색 | 공개 API (Rate Limit 있음) | 키 재발급 |
| **국토교통부 API** | 실거래가 조회 | 공개 API | 키 재발급 |

### 키 노출 방지 조치

1. **.gitignore**: `.env` 파일 자동 제외
2. **.env.example**: 템플릿만 제공 (실제 키 없음)
3. **GitHub Secrets**: CI/CD 시 환경변수 주입
4. **정기 검토**: 3개월마다 키 갱신 (Supabase, Gemini)

---

## Supabase Row-Level Security (RLS)

### RLS 정책 개요

Supabase의 Row-Level Security는 **테이블 단위 접근 제어**를 제공합니다.
사용자는 **자기 소유 데이터만** 읽고 쓸 수 있습니다.

### 적용된 RLS 정책

#### 1. `assets` 테이블 (자산 데이터)

```sql
-- 읽기: 본인 자산만 조회 가능
CREATE POLICY "Users can view their own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

-- 쓰기: 본인 자산만 추가/수정/삭제 가능
CREATE POLICY "Users can insert their own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);
```

**효과**:
- 사용자 A는 사용자 B의 자산 데이터를 **절대 볼 수 없음**
- SQL Injection 공격 시에도 RLS가 차단

#### 2. `prediction_votes` 테이블 (예측 투표)

```sql
-- 본인 투표 기록만 조회
CREATE POLICY "Users can view their own votes"
  ON prediction_votes FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 투표만 추가 (수정/삭제 금지, 조작 방지)
CREATE POLICY "Users can insert their own votes"
  ON prediction_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**효과**:
- 투표 후 수정 불가 (데이터 무결성 보장)
- 타인 투표 결과 조회 불가 (익명성 보장)

#### 3. `user_credits` 테이블 (크레딧 잔액)

```sql
-- 본인 크레딧 잔액만 조회
CREATE POLICY "Users can view their own credits"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- 크레딧 추가/차감은 Edge Function만 가능
-- (클라이언트에서 직접 수정 금지)
```

**효과**:
- 사용자는 자신의 크레딧만 확인 가능
- 크레딧 조작 불가 (Edge Function이 Service Key로만 수정)

#### 4. `analytics_events` 테이블 (분석 이벤트)

```sql
-- 쓰기 전용 (본인 이벤트만 기록, 조회는 관리자만)
CREATE POLICY "Users can insert their own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**효과**:
- 사용자는 자신의 행동만 기록 가능
- 타인 이벤트 조회 불가 (프라이버시 보호)

### RLS 미적용 테이블 (공개 데이터)

| 테이블 | 이유 | 권한 |
|--------|------|------|
| `context_cards` | 모든 사용자 공유 (오늘의 맥락 카드) | 읽기 전용 |
| `prediction_polls` | 모든 사용자 공유 (예측 질문) | 읽기 전용 |
| `market_data` | 공개 시장 데이터 | 읽기 전용 |

---

## 인증 및 권한 관리

### Supabase Auth 사용

- **이메일/비밀번호 인증**: bcrypt 해싱 (Supabase 기본)
- **소셜 로그인** (계획): Google, Apple Sign-In
- **Multi-Factor Authentication (MFA)** (출시 후): TOTP 기반 2단계 인증

### 권한 레벨

| 역할 | 권한 | 설명 |
|------|------|------|
| **Anonymous** | 읽기 금지 | 로그인 필요 |
| **Authenticated User** | 자기 데이터 읽기/쓰기 | RLS 정책 적용 |
| **Premium User** | + Premium 콘텐츠 접근 | 구독 상태로 판단 |
| **Admin** | 모든 데이터 읽기/쓰기 | Edge Function에서만 사용 |

### 세션 관리

- **세션 만료**: 7일 (Supabase 기본)
- **Refresh Token**: 자동 갱신
- **로그아웃**: 모든 디바이스에서 세션 무효화

---

## 오픈뱅킹 API 연동 (계획)

> **출시 시점**: 미구현 (수동 입력만)
> **오픈 시점**: MAU 500 + 평점 4.0+ 달성 후

### 연동 방식

1. **금융결제원 오픈뱅킹 API** 사용
2. **읽기 전용 권한**만 요청
   - 계좌 잔액 조회: ✅
   - 거래 내역 조회: ✅
   - 이체/출금: ❌ (절대 요청 안 함)

### 사용자 동의 프로세스

```
1. 사용자가 "계좌 연동" 버튼 클릭
2. 금융결제원 인증 페이지로 리다이렉트
3. 사용자가 은행 선택 + 로그인
4. "읽기 전용 권한 동의" 체크
5. 인증 완료 → baln 앱으로 돌아옴
6. Access Token을 Supabase Edge Function에 전달
7. Edge Function이 계좌번호 암호화 후 저장
```

### 보안 조치

- ✅ Access Token은 **Edge Function에만 저장** (클라이언트 노출 금지)
- ✅ 계좌번호는 **AES-256 암호화** 후 DB 저장
- ✅ 만료된 토큰 자동 갱신 (Refresh Token)
- ✅ 사용자는 언제든지 연동 해제 가능

---

## 로컬 데이터 저장

### AsyncStorage 저장 내용

baln 앱은 오프라인 모드를 지원하기 위해 일부 데이터를 로컬에 저장합니다.

| 데이터 | 키 | 민감 정보 여부 |
|--------|---|---------------|
| 자산 데이터 (Asset[]) | `@portfolio_rebalancer_assets` | ⚠️ 주의 (금액 포함) |
| Pro 구독 상태 | `@portfolio_rebalancer_pro` | ❌ 안전 |
| 세금 설정 | `@portfolio_rebalancer_tax_settings` | ❌ 안전 |
| 건강 점수 | `@portfolio_rebalancer_health_score` | ❌ 안전 |
| Analytics 이벤트 백업 | `@baln:analytics_buffer` | ❌ 안전 |
| 온보딩 완료 여부 | `@baln:onboarding_completed` | ❌ 안전 |

### 로컬 저장하지 않는 데이터 (절대 금지)

- ❌ 비밀번호
- ❌ 계좌번호 (P2 연동 시에도 저장 안 함)
- ❌ Supabase Service Key
- ❌ 신용카드 정보
- ❌ 주민등록번호

### 앱 삭제 시 데이터 처리

- **자동 삭제**: AsyncStorage 데이터 전체 삭제 (iOS/Android 기본 동작)
- **서버 데이터**: 계정 삭제 시 Supabase에서 **완전 삭제**
  - `app/settings/delete-account.tsx` 화면에서 "계정 삭제" 가능
  - Apple App Store 심사 필수 요구사항

---

## 보안 인증 로드맵

| 인증 | 목표 시점 | 진행 상태 | 비고 |
|------|----------|----------|------|
| **ISMS-P** (정보보호 관리체계) | 출시 후 6개월 | 준비 중 | 개인정보 영향평가 (PIA) 작성 |
| **ISO 27001** (정보보안 관리) | 출시 후 12개월 | 계획 | 보안 관리체계 문서화 |
| **PCI DSS** (결제 정보 보안) | 해당 없음 | - | 신용카드 정보 미저장 |
| **SOC 2 Type II** (클라우드 보안) | 출시 후 18개월 | 검토 중 | Supabase SOC 2 인증 활용 |

### 출시 전 완료된 보안 체크리스트

- [x] **SEC-001**: API 키 환경변수 관리 (.env)
- [x] **SEC-002**: .gitignore에 .env 추가
- [x] **SEC-003**: .env.example 템플릿 작성
- [x] **SEC-004**: Supabase RLS 정책 설정
- [x] **SEC-005**: Anon Key 읽기 전용 확인
- [x] **SEC-006**: SQL Injection 방지 (Prepared Statements)
- [ ] **SEC-007**: 계좌번호 암호화 (P2, 출시 후 구현)
- [x] **SEC-008**: AsyncStorage 민감 데이터 저장 금지 확인
- [ ] **SEC-009**: ISMS-P 인증 준비 (출시 후 6개월)
- [ ] **SEC-010**: ISO 27001 인증 준비 (출시 후 12개월)
- [x] **SEC-011**: 보안 백서 작성 (이 문서)
- [ ] **SEC-012**: 버그 바운티 프로그램 검토 (출시 후)

---

## 취약점 보고

### 보고 채널

baln은 책임 있는 취약점 공개 (Responsible Disclosure)를 지원합니다.

**보고 방법**:
- **이메일**: security@baln.app
- **응답 시간**: 영업일 기준 48시간 이내
- **보안 패치**: 심각도에 따라 1~7일 이내 배포

### 보상 프로그램 (출시 후)

| 심각도 | 설명 | 보상 |
|--------|------|------|
| **Critical** | 계정 탈취, DB 전체 노출 | ₩500,000 ~ ₩1,000,000 |
| **High** | RLS 우회, API 키 노출 | ₩200,000 ~ ₩500,000 |
| **Medium** | XSS, CSRF | ₩50,000 ~ ₩200,000 |
| **Low** | 정보 노출, UI 버그 | 감사 인사 + 명예의 전당 |

### 제외 사항

다음 항목은 보상 대상이 아닙니다:
- 이미 알려진 취약점
- 사회공학 (Phishing)
- DDoS 공격
- 물리적 공격

---

## 자주 묻는 질문 (FAQ)

### Q1. baln은 내 비밀번호를 저장하나요?
**A**: 아니요. Supabase Auth가 bcrypt로 해싱된 값만 저장합니다. 평문 비밀번호는 **어디에도 저장되지 않습니다**.

### Q2. 자산 데이터를 타인이 볼 수 있나요?
**A**: 아니요. Supabase RLS 정책으로 **본인 데이터만** 조회 가능합니다. 관리자도 복호화된 데이터를 직접 볼 수 없습니다.

### Q3. 계좌 연동 시 baln이 돈을 인출할 수 있나요?
**A**: 아니요. 오픈뱅킹 API는 **읽기 전용 권한**만 요청합니다. 이체/출금 권한은 **절대 요청하지 않습니다**.

### Q4. 앱을 삭제하면 데이터는 어떻게 되나요?
**A**:
- **로컬 데이터** (AsyncStorage): 자동 삭제
- **서버 데이터**: 계정 삭제 시 완전 삭제 (`app/settings/delete-account.tsx`에서 가능)

### Q5. baln은 내 데이터를 제3자에게 판매하나요?
**A**: 아니요. baln은 **절대 사용자 데이터를 판매하지 않습니다**. 개인정보 처리방침([baln.app/privacy](https://baln.app/privacy))을 참고하세요.

---

## 업데이트 내역

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| 1.0 | 2026-02-11 | 초기 버전 작성 (출시 전) |

---

**작성**: baln 주식회사 보안팀
**문의**: security@baln.app
**웹사이트**: [baln.app/security](https://baln.app/security)
