# 카카오 로그인 설정 가이드

> baln 앱에서 카카오 로그인을 활성화하기 위한 단계별 설정 가이드
> 소요 시간: 약 15분

---

## 전체 구조

```
사용자가 "카카오로 시작하기" 터치
    ↓
앱이 Supabase에 카카오 로그인 요청
    ↓
Supabase가 카카오 로그인 페이지로 이동
    ↓
사용자가 카카오 계정으로 로그인
    ↓
카카오가 Supabase로 정보 전달
    ↓
Supabase가 앱으로 로그인 완료 전달
    ↓
앱에서 자동으로 홈 화면 진입
```

**비유**: 카카오 = 출입문 경비원, Supabase = 회사 인사팀, 앱 = 사무실

---

## Step 1: 카카오 개발자 앱 만들기

### 1-1. 카카오 개발자 사이트 접속
- https://developers.kakao.com 접속
- 카카오 계정으로 로그인

### 1-2. 애플리케이션 추가
1. 상단 "내 애플리케이션" 클릭
2. "애플리케이션 추가하기" 클릭
3. 정보 입력:
   - **앱 이름**: `baln`
   - **사업자명**: `발른 주식회사`
   - **카테고리**: `금융` > `자산관리`
4. "저장" 클릭

### 1-3. 키 확인
앱이 만들어지면 "앱 키" 섹션에서:
- **REST API 키** ← 이게 필요합니다 (복사해두세요)

---

## Step 2: 카카오 로그인 활성화

### 2-1. 카카오 로그인 ON
1. 좌측 메뉴 → "카카오 로그인" 클릭
2. **활성화 설정**: OFF → **ON** 으로 변경

### 2-2. Redirect URI 등록
같은 페이지에서:
1. "Redirect URI" 섹션 → "URI 등록" 클릭
2. 아래 URI를 정확히 입력:

```
https://ruqeinfcqhgexrckonsy.supabase.co/auth/v1/callback
```

3. "저장" 클릭

### 2-3. 동의항목 설정
1. 좌측 메뉴 → "동의항목" 클릭
2. 아래 항목을 **"필수 동의"** 로 설정:
   - **닉네임**: 필수 동의
   - **카카오계정(이메일)**: 필수 동의
3. "저장" 클릭

### 2-4. Client Secret 발급
1. 좌측 메뉴 → "보안" 클릭
2. "Client Secret" → "코드 생성" 클릭
3. **활성화 상태**: 사용함 으로 변경
4. 생성된 **Client Secret** 복사해두세요

---

## Step 3: Supabase에 카카오 연결

### 3-1. Supabase 대시보드 접속
- https://supabase.com/dashboard 접속
- 프로젝트 선택 (`ruqeinfcqhgexrckonsy`)

### 3-2. Kakao Provider 활성화
1. 좌측 메뉴 → **Authentication** → **Providers**
2. 스크롤해서 **Kakao** 찾기
3. **Enable Kakao** 토글 ON
4. 정보 입력:
   - **Client ID**: Step 1에서 복사한 **REST API 키**
   - **Client Secret**: Step 2에서 발급한 **Client Secret**
5. "Save" 클릭

---

## Step 4: 테스트

1. 앱 실행 (Expo Go 또는 빌드된 앱)
2. 로그인 화면에서 **"카카오로 시작하기"** 터치
3. 카카오 로그인 웹페이지가 열림
4. 카카오 계정으로 로그인
5. 동의 화면에서 "동의하고 계속하기" 터치
6. 앱으로 자동 복귀 → 홈 화면 진입

### 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| "provider is not enabled" 에러 | Supabase에서 Kakao가 비활성화 | Step 3 다시 확인 |
| 카카오 로그인 페이지가 안 열림 | REST API 키가 틀림 | Step 1-3에서 키 다시 확인 |
| 로그인 후 앱으로 안 돌아옴 | Redirect URI가 틀림 | Step 2-2에서 URI 정확히 확인 |
| "이메일 동의 필요" 에러 | 동의항목 설정 안 됨 | Step 2-3 다시 확인 |
| 인증 후 빈 화면 | Deep link scheme 문제 | app.json에 "scheme": "baln" 확인 (이미 설정됨) |

---

## 요약: 복사해야 할 값 2개

| 어디서 | 뭘 | 어디에 넣을지 |
|--------|---|-------------|
| 카카오 개발자 > 앱 키 | **REST API 키** | Supabase > Kakao > Client ID |
| 카카오 개발자 > 보안 | **Client Secret** | Supabase > Kakao > Client Secret |

이 2개만 제대로 연결하면 카카오 로그인이 바로 작동합니다.
