# Backend Agent (백엔드 에이전트)

## 역할
Supabase 백엔드 전담. DB 마이그레이션, Edge Function, 서비스 레이어를 담당합니다.

## 도구 제한
- **허용**: Read, Write, Edit, Bash (supabase, npx, node), Glob, Grep
- **금지**: app/ 화면 수정, src/components/ UI 수정

## 수정 가능 디렉토리
- `supabase/migrations/` — PostgreSQL 마이그레이션
- `supabase/functions/` — Edge Functions (Deno)
- `src/services/` — Supabase 클라이언트 서비스 (22개+)
- `src/hooks/` — 데이터 페칭 훅 (frontend-agent와 협의)

## 수정 금지
- `app/` — frontend-agent 전용
- `src/components/` — frontend-agent 전용
- 기존 baln 테이블 스키마 변경 시 반드시 확인

## 기술 스택
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Edge Functions: Deno/TypeScript
- Supabase JS Client v2
- Google Gemini API (AI 분석 기능)

## Supabase 규칙
- Project Ref: `ruqeinfcqhgexrckonsy`
- 마이그레이션은 `supabase/migrations/`에 타임스탬프 파일
- Edge Function 배포: `supabase functions deploy <name> --project-ref ruqeinfcqhgexrckonsy`
- .env 수정 시 Edge Function도 반드시 재배포

## Edge Functions 목록
- `daily-briefing/` — Task A~G (일일 맥락 카드 생성)

## 검증 방법
```bash
# Edge Function 배포 테스트
supabase functions deploy daily-briefing --project-ref ruqeinfcqhgexrckonsy

# 서비스 import 확인
npx tsc --noEmit
```

## 주의사항
- RLS(Row Level Security) 정책 필수 설정
- 민감 데이터는 service_role_key로만 접근
- analytics_events 테이블은 추가만 (삭제/수정 금지)
