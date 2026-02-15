# Phase Tasks Tracker 마이그레이션 적용 방법

이 마이그레이션을 적용하려면 아래 방법 중 하나를 선택하세요.

## 방법 1: Supabase CLI 사용 (권장)

```bash
cd ~/baln
supabase db push --db-url "postgresql://postgres.ruqeinfcqhgexrckonsy:Baln0926!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
```

또는 특정 마이그레이션 파일만 실행:

```bash
psql "postgresql://postgres.ruqeinfcqhgexrckonsy:Baln0926!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" -f supabase/migrations/20260215_phase_tasks_tracker.sql
```

## 방법 2: Supabase Dashboard SQL Editor 사용

1. https://supabase.com/dashboard/project/ruqeinfcqhgexrckonsy/sql/new 접속
2. `supabase/migrations/20260215_phase_tasks_tracker.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. Run 버튼 클릭

## 방법 3: MacBook에서 직접 실행

MacBook Pro M5에서:

```bash
cd ~/smart-rebalancer
git pull origin main
psql "postgresql://postgres.ruqeinfcqhgexrckonsy:Baln0926!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" -f supabase/migrations/20260215_phase_tasks_tracker.sql
```

---

## 마이그레이션 완료 후 확인

관리자 대시보드 접속:
1. https://baln-web.vercel.app/admin/ 접속 (또는 로컬: /Users/nicenoodle/baln-web/admin/index.html)
2. Supabase URL과 Service Key 입력하여 로그인
3. WBS 탭 클릭
4. Phase 9-12 실행 계획 섹션에서 진행률 바 확인
5. 🔄 새로고침 버튼 클릭하여 데이터 로드 확인

---

## 기능 설명

### 1. 진행률 바
- 각 Phase별 완료/진행 중/블로킹 작업 수 표시
- 진행률 퍼센트 자동 계산

### 2. 인터랙티브 체크리스트
- Phase 카드 클릭 → 상세 작업 목록 표시/숨김
- 작업 아이콘 클릭 → 상태 변경 (pending → in_progress → completed)
  - ⬜ 대기 중
  - 🔄 진행 중
  - ✅ 완료
  - 🚫 블로킹

### 3. 우선순위 표시
- 🔴 긴급 (priority=2)
- 🟡 중요 (priority=1)
- 일반 (priority=0, 표시 없음)

### 4. 블로킹 사유
- 작업이 blocked 상태일 때 이유 표시

---

## 데이터 관리

### 작업 추가 (SQL Editor)

```sql
INSERT INTO phase_tasks (phase_number, task_title, task_description, status, priority)
VALUES (9, '새 작업', '작업 설명', 'pending', 0);
```

### 작업 상태 변경 (Dashboard 또는 SQL)

Dashboard: 작업 아이콘 클릭으로 자동 변경

SQL:
```sql
UPDATE phase_tasks
SET status = 'completed'
WHERE task_title = '5탭 → 3탭 전환';
```

### 작업 삭제

```sql
DELETE FROM phase_tasks
WHERE id = 'task-uuid';
```

---

## 문제 해결

### 데이터 로드 실패 시

1. Supabase Service Key 확인 (RLS 정책 확인)
2. 브라우저 개발자 도구 Console 확인
3. phase_tasks 테이블 존재 여부 확인:

```sql
SELECT * FROM phase_tasks LIMIT 5;
```

### 진행률 바가 표시되지 않을 때

1. WBS 탭이 활성화되어 있는지 확인
2. 🔄 새로고침 버튼 클릭
3. 브라우저 캐시 삭제 후 재접속
