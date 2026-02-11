# Google Play Console - Data Safety 설정 가이드

**앱 이름**: baln (발른) - 투자 습관 형성
**제출 일자**: 2026년 2월 (App Store 승인 후)
**목적**: Google Play Console의 "Data safety" 섹션 작성 가이드

---

## 1. Data Collection and Security (데이터 수집 및 보안)

### Q1. Does your app collect or share any of the required user data types?
**Answer**: ✅ **Yes**

---

## 2. Data Types Collected (수집하는 데이터 유형)

### 2.1 Personal Info (개인 정보)
| Data Type | Collected? | Shared? | Purpose | Optional/Required | Encrypted in Transit | Deletable |
|-----------|------------|---------|---------|-------------------|----------------------|-----------|
| **Email address** | ✅ Yes | ❌ No | Account management, App functionality | Required | ✅ Yes | ✅ Yes |
| Name | ❌ No | ❌ No | - | - | - | - |
| User IDs | ✅ Yes | ❌ No | App functionality (Supabase Auth) | Required | ✅ Yes | ✅ Yes |

---

### 2.2 Financial Info (금융 정보)
| Data Type | Collected? | Shared? | Purpose | Optional/Required | Encrypted in Transit | Deletable |
|-----------|------------|---------|---------|-------------------|----------------------|-----------|
| **User payment info** | ❌ No | ❌ No | (Google Play Billing 처리) | - | - | - |
| **Purchase history** | ✅ Yes | ❌ No | App functionality (Premium 구독 관리) | Optional | ✅ Yes | ✅ Yes |
| **Other financial info** | ✅ Yes | ⚠️ Yes (Google Gemini AI only) | App functionality (Portfolio 분석) | Optional | ✅ Yes | ✅ Yes |

**참고**: Portfolio data는 Google Gemini API로 전송되어 AI 분석에 사용되지만, 익명화되어 개인 식별 불가.

---

### 2.3 App Activity (앱 활동)
| Data Type | Collected? | Shared? | Purpose | Optional/Required | Encrypted in Transit | Deletable |
|-----------|------------|---------|---------|-------------------|----------------------|-----------|
| **App interactions** | ✅ Yes | ❌ No | Analytics, App functionality (예측 투표 기록) | Required | ✅ Yes | ✅ Yes |
| **In-app search history** | ❌ No | ❌ No | - | - | - | - |
| **Other user-generated content** | ✅ Yes | ❌ No | App functionality (커뮤니티 게시글, 선택사항) | Optional | ✅ Yes | ✅ Yes |

---

### 2.4 App Info and Performance (앱 정보 및 성능)
| Data Type | Collected? | Shared? | Purpose | Optional/Required | Encrypted in Transit | Deletable |
|-----------|------------|---------|---------|-------------------|----------------------|-----------|
| **Crash logs** | ✅ Yes | ❌ No | Analytics (버그 수정) | Required | ✅ Yes | ⚠️ Aggregated (익명 집계) |
| **Diagnostics** | ✅ Yes | ❌ No | Analytics (성능 개선) | Required | ✅ Yes | ⚠️ Aggregated (익명 집계) |

---

### 2.5 Device or Other IDs (기기 또는 기타 ID)
| Data Type | Collected? | Shared? | Purpose | Optional/Required | Encrypted in Transit | Deletable |
|-----------|------------|---------|---------|-------------------|----------------------|-----------|
| **Device or other IDs** | ❌ No | ❌ No | - | - | - | - |

**참고**: baln은 기기 ID를 수집하지 않으며, User ID (Supabase Auth UUID)만 사용.

---

## 3. Data Usage and Handling (데이터 사용 및 처리)

### 3.1 Purpose of Data Collection
| Purpose | Description |
|---------|-------------|
| **App functionality** | 서비스 제공 (포트폴리오 관리, AI 진단, 맥락 카드) |
| **Analytics** | 앱 사용 패턴 분석, 서비스 개선 |
| **Personalization** | 맞춤형 맥락 카드, 또래 비교 |
| **Account management** | 계정 생성, 로그인, 복구 |

**사용하지 않는 목적**:
- ❌ Advertising or marketing (광고 또는 마케팅)
- ❌ Fraud prevention, security, and compliance (사기 방지, 보안, 컴플라이언스)
- ❌ Functionality not related to this app (다른 앱 기능)

---

### 3.2 Data Sharing with Third Parties
**Q. Do you share any of the required user data types with third parties?**
**Answer**: ⚠️ **Yes** (서비스 제공 목적만)

| Third Party | Data Shared | Purpose | Location |
|-------------|-------------|---------|----------|
| **Supabase Inc.** | 이메일, 자산 데이터, Analytics 이벤트 | 데이터베이스 호스팅, 백엔드 서비스 | 미국 (US) |
| **Google LLC (Gemini AI)** | 자산 데이터 (익명화) | AI 포트폴리오 분석 | 미국 (US) |

**중요**: 제3자는 개인 식별 정보를 광고 또는 마케팅 목적으로 사용하지 않습니다.

---

## 4. Data Security (데이터 보안)

### Q. Is all of the user data collected by your app encrypted in transit?
**Answer**: ✅ **Yes**
- SSL/TLS 암호화 (HTTPS)
- Supabase 보안 연결

### Q. Do you provide a way for users to request that their data be deleted?
**Answer**: ✅ **Yes**
- 방법 1: 앱 설정 > 계정 삭제 (즉시 삭제)
- 방법 2: 이메일 요청 (privacy@baln.app)
- 삭제 기간: 30일 이내 완전 삭제

---

## 5. Data Retention and Deletion (데이터 보유 및 삭제)

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| 이메일, 자산 데이터 | 회원 탈퇴 시 즉시 삭제 | 앱 설정 > 계정 삭제 |
| Analytics 이벤트 | 익명화 후 1년 보관 | 자동 삭제 (개인 식별 불가) |
| 커뮤니티 게시글 | 삭제 요청 시 즉시 | 게시글 메뉴 > 삭제 |

---

## 6. Content Rating (콘텐츠 등급)

### Q. What is the target age group for your app?
**Answer**: **만 12세 이상** (PEGI 12, ESRB Everyone 12+)

**이유**:
- 금융 정보 포함 (포트폴리오 자산 데이터)
- 커뮤니티 기능 (만 12세 이상 권장)

**Google Play 등급 질문 답변**:
- Violence: No
- Blood: No
- Sexual Content: No
- Profanity: No
- Drugs: No
- Alcohol: No
- Gambling: No
- Scary Content: No
- **Financial Info**: Yes (포트폴리오 자산 데이터)

---

## 7. Ads Declaration (광고 선언)

### Q. Does your app contain ads?
**Answer**: ❌ **No**

baln 앱은 제3자 광고를 포함하지 않습니다.
수익 모델: Premium 구독 (₩4,900/월)

---

## 8. Google Play Console 작성 순서

1. Google Play Console → All apps → baln 선택
2. **App content** 섹션 → **Data safety** 클릭
3. \"Get started\" 클릭
4. 위 데이터 유형별로 체크:
   - Personal info > Email address ✅, User IDs ✅
   - Financial info > Purchase history ✅, Other financial info ✅
   - App activity > App interactions ✅, Other user-generated content ✅
   - App info and performance > Crash logs ✅, Diagnostics ✅
5. 각 데이터 유형별:
   - **Collected**: Yes/No 선택
   - **Shared**: Yes/No 선택 (Gemini AI 공유만 Yes)
   - **Purpose**: App functionality, Analytics 선택
   - **Optional/Required**: 선택
   - **Encrypted in transit**: Yes (모두)
   - **Deletable**: Yes 선택
6. Data security 질문 답변:
   - Encrypted in transit: Yes
   - User can request deletion: Yes
7. Save → Publish

---

## 9. 한국어 개인정보 처리방침 링크

Google Play는 앱 등록 시 **개인정보 처리방침 URL**을 요구합니다.

**URL**: https://baln.app/privacy

**참고**:
- 이 URL은 `/Users/nicenoodle/smart-rebalancer/docs/PRIVACY_POLICY.md` 내용을 웹으로 퍼블리시한 것입니다.
- App Store와 동일한 내용 사용 가능.

---

## 10. 앱 설명 (App Description, 4,000자 이내)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 baln - 투자자의 Sleep Cycle
━━━━━━━━━━━━━━━━━━━━━━━━━━

"시장이 -5% 빠졌을 때, 당신은 어떻게 하시나요?"

패닉셀? FOMO 매수?
자기만의 투자 기준이 없다면, 감정에 휘둘릴 수밖에 없습니다.

baln은 매일 5분 시장 맥락을 읽으며
"자기만의 투자 기준"을 형성하게 돕는 습관 앱입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 이런 분들을 위한 앱입니다
━━━━━━━━━━━━━━━━━━━━━━━━━━

• 시장 급락 시 패닉셀하는 분
• 시장 급등 시 FOMO 매수하는 분
• "왜 내 주식만 안 오르지?"라고 생각하는 분
• 자기만의 투자 기준이 없는 분
• 투자 공부를 하고 싶지만 어디서부터 시작할지 모르는 분

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 baln은 이렇게 돕습니다
━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ 매일 5분 맥락 카드
오늘 시장이 왜 이렇게 움직였는지 4겹 맥락으로 설명합니다.

2️⃣ 예측 게임으로 학습 강화
맥락을 읽은 뒤 내일 시장을 예측해보세요.
127일 연속 출석하면 패닉셀 확률 80% ↓

3️⃣ AI 포트폴리오 진단 (Gemini AI)
내 포트폴리오 건강 점수를 A~F 등급으로 분석합니다.

4️⃣ 또래 비교 (익명, MAU 200명 달성 시 오픈)
같은 자산 구간 평균과 비교하여 맥락 이해도를 측정합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 면책 조항 (중요!)
━━━━━━━━━━━━━━━━━━━━━━━━━━

baln 앱은 투자 교육 목적 앱이며, 투자 권유가 아닙니다.

✅ 제공: 시장 맥락 이해, 투자 지식 학습
❌ 제공 안 함: 종목 추천, 수익 보장, 투자 자문

모든 투자 결정은 본인의 책임입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 문의 & 지원
━━━━━━━━━━━━━━━━━━━━━━━━━━

• 웹사이트: https://baln.app
• 이메일: support@baln.app
• FAQ: 앱 설정 > 도움말

━━━━━━━━━━━━━━━━━━━━━━━━━━

매일 5분, 127일 후 당신은 다른 사람이 됩니다.

"투자자의 Sleep Cycle, baln"
```

**글자 수**: 약 1,500자 (4,000자 제한 내)

---

## 11. 참고 자료

- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Data safety form best practices](https://developer.android.com/google/play/data-safety-best-practices)
- [Privacy Policy Guidelines](https://support.google.com/googleplay/android-developer/answer/9859455)

---

**작성 완료**: 2026-02-11
**담당자**: Legal & Marketing Lead
**최종 제출**: Google Play Console에서 직접 입력 (이 문서는 가이드용)
**App Store 승인 후 제출 권장** (iOS 먼저 출시 후 Android 출시)
