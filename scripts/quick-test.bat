@echo off
REM Quick Integration Test Script (Windows)
REM 각 인스턴스 작업 완료 후 실행하여 빠르게 검증

echo.
echo ===== baln (발른) - Quick Integration Test =====
echo.

REM 1. TypeScript 타입 체크
echo [1/4] TypeScript 타입 체크 중...
call npx tsc --noEmit
if %ERRORLEVEL% EQU 0 (
  echo ✅ 타입 에러 없음
) else (
  echo ❌ 타입 에러 발견 - 수정 필요
  exit /b 1
)
echo.

REM 2. 필수 환경변수 체크
echo [2/4] 환경변수 체크 중...
if exist .env (
  findstr /C:"EXPO_PUBLIC_SUPABASE_URL" .env >nul
  if %ERRORLEVEL% EQU 0 (
    echo ✅ Supabase 환경변수 설정됨
  ) else (
    echo ❌ Supabase 환경변수 누락
    exit /b 1
  )
) else (
  echo ❌ .env 파일 없음
  exit /b 1
)
echo.

REM 3. 주요 파일 존재 확인
echo [3/4] 주요 파일 존재 확인 중...
set FILES_OK=1

if not exist "src\components\rebalance\WhatIfSimulator.tsx" (
  echo ⚠️  WhatIfSimulator.tsx 없음
  set FILES_OK=0
)

if not exist "src\components\CommunityPostCard.tsx" (
  echo ⚠️  CommunityPostCard.tsx 없음
  set FILES_OK=0
)

if not exist "src\components\predictions\PollCard.tsx" (
  echo ⚠️  PollCard.tsx 없음
  set FILES_OK=0
)

if %FILES_OK% EQU 1 (
  echo ✅ 주요 파일 모두 존재
) else (
  echo ⚠️  일부 파일 누락 - 해당 인스턴스 작업 확인 필요
)
echo.

REM 4. Git 상태 체크
echo [4/4] Git 상태 체크 중...
git status --short
echo.

echo ================================================
echo ✅ Quick Test 완료!
echo.
echo 📋 다음 단계:
echo   1. npx expo start 로 개발 서버 실행
echo   2. QA_INTEGRATION_CHECKLIST.md 에서 수동 테스트 진행
echo   3. 이슈 발견 시 해당 인스턴스에 피드백
echo.
pause
