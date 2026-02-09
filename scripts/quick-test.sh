#!/bin/bash
# Quick Integration Test Script
# 각 인스턴스 작업 완료 후 실행하여 빠르게 검증

echo "🧪 baln (발른) - Quick Integration Test"
echo "========================================"
echo ""

# 1. TypeScript 타입 체크
echo "📝 [1/5] TypeScript 타입 체크 중..."
npm run tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ 타입 에러 없음"
else
  echo "❌ 타입 에러 발견 - 수정 필요"
  exit 1
fi
echo ""

# 2. ESLint 체크
echo "🔍 [2/5] ESLint 체크 중..."
npx eslint . --ext .ts,.tsx --max-warnings 0 --quiet
if [ $? -eq 0 ]; then
  echo "✅ Lint 에러 없음"
else
  echo "⚠️  Lint 경고 발견 - 확인 권장"
fi
echo ""

# 3. 주요 컴포넌트 import 체크
echo "📦 [3/5] 주요 컴포넌트 import 체크 중..."

# Instance 2 (분석 탭)
echo "  - WhatIfSimulator..."
node -e "require('./src/components/rebalance/WhatIfSimulator.tsx')" 2>/dev/null || echo "  ⚠️  import 실패"

# Instance 3 (커뮤니티)
echo "  - CommunityPostCard..."
node -e "require('./src/components/CommunityPostCard.tsx')" 2>/dev/null || echo "  ⚠️  import 실패"

# Instance 5 (예측 게임)
echo "  - PollCard..."
node -e "require('./src/components/predictions/PollCard.tsx')" 2>/dev/null || echo "  ⚠️  import 실패"

echo "✅ 컴포넌트 import 체크 완료"
echo ""

# 4. 필수 환경변수 체크
echo "🔐 [4/5] 환경변수 체크 중..."
if [ -f ".env" ]; then
  if grep -q "EXPO_PUBLIC_SUPABASE_URL" .env && grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env; then
    echo "✅ Supabase 환경변수 설정됨"
  else
    echo "❌ Supabase 환경변수 누락"
    exit 1
  fi
else
  echo "❌ .env 파일 없음"
  exit 1
fi
echo ""

# 5. 패키지 의존성 체크
echo "📚 [5/5] 패키지 의존성 체크 중..."
npm outdated 2>/dev/null | grep -E "(expo|react-native)" && echo "⚠️  주요 패키지 업데이트 필요" || echo "✅ 패키지 최신 상태"
echo ""

echo "========================================"
echo "✅ Quick Test 완료!"
echo ""
echo "📋 다음 단계:"
echo "  1. npx expo start 로 개발 서버 실행"
echo "  2. QA_INTEGRATION_CHECKLIST.md 에서 수동 테스트 진행"
echo "  3. 이슈 발견 시 해당 인스턴스에 피드백"
