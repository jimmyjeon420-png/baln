# App Store Connect - App Privacy 설정 가이드

**앱 이름**: baln (발른) - 투자 습관 형성
**제출 일자**: 2026년 2월 14일
**목적**: App Store Connect의 "App Privacy" 섹션 작성 가이드

---

## 1. Data Collection (데이터 수집)

### Q1. Does your app collect data?
**Answer**: ✅ **Yes**

---

## 2. Data Types (수집하는 데이터 유형)

### 2.1 Contact Info (연락처 정보)
| Data Type | Collected? | Purpose | Linked to User | Used for Tracking |
|-----------|------------|---------|----------------|-------------------|
| **Email Address** | ✅ Yes | Account Creation, App Functionality, Customer Support | ✅ Yes | ❌ No |
| Name | ❌ No | - | - | - |
| Phone Number | ❌ No | - | - | - |

---

### 2.2 Financial Info (금융 정보)
| Data Type | Collected? | Purpose | Linked to User | Used for Tracking |
|-----------|------------|---------|----------------|-------------------|
| **Purchase History** | ✅ Yes | App Functionality (Premium 구독) | ✅ Yes | ❌ No |
| Payment Info | ❌ No | (Apple이 처리) | - | - |
| Credit Info | ❌ No | - | - | - |
| Other Financial Info | ✅ Yes | **Portfolio Data** (자산 종목, 수량, 매입가) | ✅ Yes | ❌ No |

---

### 2.3 Usage Data (사용 데이터)
| Data Type | Collected? | Purpose | Linked to User | Used for Tracking |
|-----------|------------|---------|----------------|-------------------|
| **Product Interaction** | ✅ Yes | Analytics, App Functionality (예측 투표 기록) | ✅ Yes | ❌ No |
| Advertising Data | ❌ No | - | - | - |
| Other Usage Data | ✅ Yes | **Analytics Events** (화면 조회, 버튼 클릭) | ⚠️ **No** (익명 집계) | ❌ No |

---

### 2.4 Identifiers (식별자)
| Data Type | Collected? | Purpose | Linked to User | Used for Tracking |
|-----------|------------|---------|----------------|-------------------|
| **User ID** | ✅ Yes | App Functionality (Supabase Auth) | ✅ Yes | ❌ No |
| Device ID | ❌ No | - | - | - |

---

### 2.5 Diagnostics (진단)
| Data Type | Collected? | Purpose | Linked to User | Used for Tracking |
|-----------|------------|---------|----------------|-------------------|
| **Crash Data** | ✅ Yes | App Functionality (버그 수정) | ⚠️ **No** (익명) | ❌ No |
| Performance Data | ✅ Yes | App Functionality (성능 개선) | ⚠️ **No** (익명) | ❌ No |

---

### 2.6 Other Data (기타)
| Data Type | Collected? | Purpose | Linked to User | Used for Tracking |
|-----------|------------|---------|----------------|-------------------|
| **Real Estate Data** | ✅ Yes | App Functionality (총자산 계산, 선택사항) | ✅ Yes | ❌ No |

---

## 3. Data Usage Purposes (데이터 사용 목적)

| Purpose | Description |
|---------|-------------|
| **App Functionality** | 서비스 제공 (포트폴리오 관리, AI 진단, 맥락 카드) |
| **Analytics** | 앱 사용 패턴 분석, 서비스 개선 |
| **Product Personalization** | 맞춤형 맥락 카드, 또래 비교 |
| **Customer Support** | 문의 응대, 계정 문제 해결 |

**사용하지 않는 목적**:
- ❌ Third-Party Advertising (제3자 광고)
- ❌ Developer's Advertising or Marketing (자사 마케팅 광고)
- ❌ Other Purposes (기타 목적)

---

## 4. Third-Party Data (제3자 데이터 공유)

### Q. Does your app share data with third parties?
**Answer**: ✅ **Yes** (서비스 제공 목적)

| Third Party | Data Shared | Purpose |
|-------------|-------------|---------|
| **Supabase Inc.** (미국) | 이메일, 자산 데이터, Analytics 이벤트 | 데이터베이스 호스팅, 백엔드 서비스 |
| **Google LLC (Gemini AI)** (미국) | 자산 데이터 (익명화) | AI 포트폴리오 분석 |

**참고**: 제3자는 개인 식별 정보를 마케팅 목적으로 사용하지 않습니다.

---

## 5. Data Retention and Deletion (데이터 보유 및 삭제)

### Q. How long do you retain user data?
**Answer**:
- 회원 탈퇴 시 **즉시 삭제** (30일 이내 완전 삭제)
- Analytics 이벤트: 익명화 후 1년 보관 (개인 식별 불가 상태)

### Q. Can users request deletion of their data?
**Answer**: ✅ **Yes**
- 방법 1: 앱 설정 > 계정 삭제 (즉시 삭제)
- 방법 2: 이메일 요청 (privacy@baln.app)

---

## 6. Data Security (데이터 보안)

### Q. What security measures do you use?
**Answer**:
- ✅ **Encryption in Transit** (SSL/TLS, HTTPS)
- ✅ **Encryption at Rest** (Supabase 암호화, bcrypt 비밀번호)
- ✅ **Row-Level Security** (Supabase RLS 적용)
- ✅ **Access Control** (최소 권한 원칙)

---

## 7. Age Rating (연령 등급)

### Q. What is the age rating for your app?
**Answer**: **12+** (금융 정보 포함)

**Apple 등급 기준**:
- Infrequent/Mild Simulated Gambling: **None**
- Infrequent/Mild Realistic Violence: **None**
- Infrequent/Mild Sexual Content: **None**
- Infrequent/Mild Profanity: **None**
- **Financial Info**: ✅ Yes (포트폴리오 자산 데이터)

---

## 8. Content Rights (콘텐츠 권리)

### Q. Do you have rights to all content in the app?
**Answer**: ✅ **Yes**

**저작권 소유**:
- 맥락 카드, UI 디자인: 발른 주식회사 소유
- Gemini AI: Google LLC 라이선스 ("Powered by Google Gemini" 표시)
- 거장 인사이트: 공개 데이터 (출처 명시)

---

## 9. Tracking (추적)

### Q. Does your app use data for tracking purposes?
**Answer**: ❌ **No**

**정의**: "Tracking"은 제3자 광고 또는 데이터 브로커와 데이터를 공유하는 것을 의미합니다.
baln은 자체 Analytics만 사용하며, 제3자 광고 네트워크와 데이터를 공유하지 않습니다.

---

## 10. App Store Connect 작성 순서

1. App Store Connect → My Apps → baln 선택
2. **App Information** 섹션 → **App Privacy** 클릭
3. "Get Started" 클릭
4. 위 데이터 유형별로 체크:
   - Contact Info > Email Address ✅
   - Financial Info > Purchase History ✅, Other Financial Info ✅
   - Usage Data > Product Interaction ✅, Other Usage Data ✅
   - Identifiers > User ID ✅
   - Diagnostics > Crash Data ✅, Performance Data ✅
5. 각 데이터 유형별 목적 선택:
   - App Functionality ✅
   - Analytics ✅
   - Product Personalization ✅
   - Customer Support ✅
6. "Linked to User" vs "Not Linked to User" 선택 (위 표 참조)
7. "Used for Tracking": **모두 No** 선택
8. Save → Publish

---

## 참고 자료

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Understanding App Privacy Nutrition Labels](https://developer.apple.com/videos/play/wwdc2020/10676/)
- [Privacy on the App Store](https://developer.apple.com/app-store/user-privacy-and-data-use/)

---

**작성 완료**: 2026-02-11
**담당자**: Legal & Marketing Lead
**최종 제출**: App Store Connect에서 직접 입력 (이 문서는 가이드용)
