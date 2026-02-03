/**
 * Supabase 데이터베이스 테이블 생성 스크립트
 * 주의: 이 파일은 Supabase SQL Editor에서 직접 실행해야 합니다.
 */

// ============================================
// SQL 코드 - Supabase SQL Editor에서 복사해서 실행하세요
// ============================================
/*

-- 1. 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  macro_phase VARCHAR(50), -- "accumulation", "markup", "distribution", "markdown"
  sentiment_score INT DEFAULT 0, -- -100 ~ 100
  vix_level FLOAT DEFAULT 0,
  CONSTRAINT macro_phase_valid CHECK (macro_phase IN ('accumulation', 'markup', 'distribution', 'markdown', NULL))
);

-- 2. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- "user" or "assistant"
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  sentiment_response INT, -- AI의 감정 점수 응답
  macro_advice TEXT,
  CONSTRAINT role_valid CHECK (role IN ('user', 'assistant'))
);

-- 3. 일일 요약 테이블
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  sentiment_score INT DEFAULT 0, -- -100 ~ 100
  portfolio_value FLOAT NOT NULL,
  day_change_percent FLOAT DEFAULT 0,
  recommendation TEXT,
  transaction_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user ON daily_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(summary_date);

-- Row Level Security (RLS) 활성화
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- 4. 팀 채팅 메시지 테이블 (전략 회의실용)
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id VARCHAR(100) NOT NULL DEFAULT 'global-strategy', -- 채팅방 ID
  user_id VARCHAR(255) NOT NULL, -- auth.users.id 또는 guest ID
  user_name VARCHAR(100) NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- 팀 메시지 인덱스
CREATE INDEX IF NOT EXISTS idx_team_messages_room ON team_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created ON team_messages(created_at DESC);

-- 팀 메시지 RLS (모든 인증된 사용자가 읽기/쓰기 가능)
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team messages"
  ON team_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert team messages"
  ON team_messages FOR INSERT
  WITH CHECK (true);

-- Realtime 활성화 (중요!)
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;

-- 5. 자산 테이블 (포트폴리오)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity FLOAT NOT NULL DEFAULT 0,
  avg_price FLOAT NOT NULL DEFAULT 0,
  current_price FLOAT NOT NULL DEFAULT 0,
  asset_type VARCHAR(50) DEFAULT 'stock', -- 'stock', 'crypto', 'etf', 'bond', 'cash'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 자산 인덱스
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_ticker ON assets(ticker);

-- 자산 RLS 활성화
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 정책: 자신의 데이터만 접근 가능
CREATE POLICY "Users can view their own chat_sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat_sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat_sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat_sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages from their sessions"
  ON chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages to their sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own daily_summaries"
  ON daily_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily_summaries"
  ON daily_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily_summaries"
  ON daily_summaries FOR UPDATE
  USING (auth.uid() = user_id);

*/

// ============================================
// TypeScript 헬퍼 함수 (선택사항)
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 채팅 세션 생성
 */
export const createChatSession = async (
  userId: string,
  title: string,
  macroPhase?: string
) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title,
        macro_phase: macroPhase || null,
      })
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('채팅 세션 생성 실패:', error);
    throw error;
  }
};

/**
 * 채팅 메시지 추가
 */
export const addChatMessage = async (
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sentimentResponse?: number,
  macroAdvice?: string
) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        sentiment_response: sentimentResponse || null,
        macro_advice: macroAdvice || null,
      })
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('메시지 추가 실패:', error);
    throw error;
  }
};

/**
 * 채팅 세션 이력 조회
 */
export const getChatHistory = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('채팅 이력 조회 실패:', error);
    throw error;
  }
};

/**
 * 일일 요약 저장
 */
export const saveDailySummary = async (
  userId: string,
  summaryDate: string,
  portfolioValue: number,
  sentimentScore: number,
  recommendation: string,
  dayChangePercent: number = 0,
  transactionCount: number = 0
) => {
  try {
    const { data, error } = await supabase
      .from('daily_summaries')
      .upsert({
        user_id: userId,
        summary_date: summaryDate,
        portfolio_value: portfolioValue,
        sentiment_score: sentimentScore,
        recommendation,
        day_change_percent: dayChangePercent,
        transaction_count: transactionCount,
      })
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('일일 요약 저장 실패:', error);
    throw error;
  }
};

/**
 * 일일 요약 조회
 */
export const getDailySummaries = async (userId: string, days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', startDate.toISOString().split('T')[0])
      .order('summary_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('일일 요약 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자의 모든 채팅 세션 조회
 */
export const getUserChatSessions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('채팅 세션 조회 실패:', error);
    throw error;
  }
};
