-- Phase 9-12 작업 추적 테이블
-- 관리자 대시보드에서 실시간 진행률 표시용

CREATE TABLE IF NOT EXISTS phase_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 9 AND 12),
  task_title TEXT NOT NULL,
  task_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  priority INTEGER DEFAULT 0, -- 0: normal, 1: high, 2: critical
  assignee TEXT, -- 담당자 (optional)
  blocking_reason TEXT, -- 블로킹 이유 (status='blocked'일 때)
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_phase_tasks_phase ON phase_tasks(phase_number);
CREATE INDEX idx_phase_tasks_status ON phase_tasks(status);

-- 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_phase_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phase_tasks_updated_at
  BEFORE UPDATE ON phase_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_tasks_updated_at();

-- Phase 9 작업 데이터 삽입
INSERT INTO phase_tasks (phase_number, task_title, task_description, status, priority) VALUES
  (9, '5탭 → 3탭 전환', 'app/(tabs)/_layout.tsx 수정', 'pending', 2),
  (9, '오늘 탭 리디자인', '맥락 카드 UI 컴포넌트 작성', 'pending', 2),
  (9, '온보딩 개선', '첫 자산 등록 → 첫 맥락 카드 경험', 'pending', 1),
  (9, 'Premium 페이월 연결', '맥락 카드 4겹 중 2겹만 무료', 'pending', 1),
  (9, 'iOS 빌드 & TestFlight 제출', '내부 테스트 (3명 이상)', 'pending', 2);

-- Phase 10 작업 데이터 삽입
INSERT INTO phase_tasks (phase_number, task_title, task_description, status) VALUES
  (10, '아침 7:30 푸시 알림', '어제 예측 결과 + 오늘 맥락', 'pending'),
  (10, '3일 미접속 알림', '시장 급락 시 맥락 확인 유도', 'pending'),
  (10, '연속 기록 (스트릭) 시스템', '7일 연속 출석 달성 시 +10C', 'pending'),
  (10, '또래 비교 평균 건강 점수', '같은 자산 구간 평균 계산', 'pending'),
  (10, '또래보다 높아요 넛지 카드', '+5점 높을 때 표시', 'pending'),
  (10, '복기 루프 강화', '어제 예측 vs 실제 결과 비교 UI', 'pending');

-- Phase 11 작업 데이터 삽입
INSERT INTO phase_tasks (phase_number, task_title, task_description, status) VALUES
  (11, '건강 점수 카드 이미지 생성', 'OG Image 시스템', 'pending'),
  (11, '카카오톡 공유 기능', '공유 시 5C 보상', 'pending'),
  (11, '공유 클릭 추적', '가입 추적 시스템', 'pending'),
  (11, '초대 코드 생성', '친구 초대 시스템', 'pending'),
  (11, '친구 초대 보상', '양쪽 각 10C 지급', 'pending'),
  (11, '초대 리더보드', '상위 10명 Premium 1개월 무료', 'pending');

-- Phase 12 작업 데이터 삽입
INSERT INTO phase_tasks (phase_number, task_title, task_description, status) VALUES
  (12, '위기 전환 알림', '시장 -3% 급락 시 Premium 잠금', 'pending'),
  (12, '손실 회피 경고', '연속 기록 사라짐 경고', 'pending'),
  (12, '가치 비교 화면', '무료 vs Premium 기능 비교', 'pending'),
  (12, '3일 체험권', '5C로 구매 가능', 'pending'),
  (12, '가격 A/B 테스트', 'A그룹 ₩4,900 vs B그룹 ₩3,900', 'pending');

-- RLS 비활성화 (관리자 전용 테이블)
ALTER TABLE phase_tasks ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능 (service_role key 사용)
CREATE POLICY "Service role only" ON phase_tasks
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE phase_tasks IS 'Phase 9-12 작업 추적 테이블 (관리자 대시보드용)';
