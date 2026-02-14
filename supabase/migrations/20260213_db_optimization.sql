-- ============================================================================
-- baln DB 최적화 마이그레이션 (2026-02-13)
-- 모든 테이블/컬럼 참조 전 존재 여부 확인
-- ============================================================================

-- ========== PART 1: RLS 정책 보완 ==========================================

-- 1-1. profiles: INSERT 정책
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_own') THEN
      CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
  END IF;
END $$;

-- 1-2. user_credits: INSERT 정책
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_credits') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_credits' AND policyname='user_credits_insert_own') THEN
      CREATE POLICY user_credits_insert_own ON user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- 1-3. credit_transactions: INSERT 정책
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credit_transactions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_transactions' AND policyname='credit_transactions_insert_own') THEN
      CREATE POLICY credit_transactions_insert_own ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- 1-4. prediction_votes: INSERT 정책
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prediction_votes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prediction_votes' AND policyname='prediction_votes_insert_own') THEN
      CREATE POLICY prediction_votes_insert_own ON prediction_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- 1-5~13. service_role 전체 접근 (테이블 존재 시에만)
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl, pol IN VALUES
    ('analytics_events', 'service_all_analytics_events'),
    ('user_daily_prescriptions', 'service_all_user_daily_prescriptions'),
    ('user_goals', 'service_all_user_goals'),
    ('health_score_history', 'service_all_health_score_history'),
    ('app_metrics', 'service_all_app_metrics'),
    ('feature_flags', 'service_all_feature_flags'),
    ('prediction_polls', 'service_all_prediction_polls'),
    ('prediction_user_stats', 'service_all_prediction_user_stats'),
    ('daily_quizzes', 'service_all_daily_quizzes'),
    ('post_reports', 'service_all_post_reports')
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=tbl AND policyname=pol) THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', pol, tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 1-14. referral_pending_rewards: RLS 활성화 + 정책
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='referral_pending_rewards') THEN
    ALTER TABLE referral_pending_rewards ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_pending_rewards' AND policyname='referral_rewards_read_own') THEN
      CREATE POLICY referral_rewards_read_own ON referral_pending_rewards FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_pending_rewards' AND policyname='service_all_referral_rewards') THEN
      CREATE POLICY service_all_referral_rewards ON referral_pending_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- 1-15. community_posts: UPDATE WITH CHECK
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='community_posts') THEN
    DROP POLICY IF EXISTS "community_posts_update" ON community_posts;
    CREATE POLICY "community_posts_update" ON community_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 1-16. gatherings: UPDATE WITH CHECK
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gatherings') THEN
    DROP POLICY IF EXISTS "gatherings_update" ON gatherings;
    CREATE POLICY "gatherings_update" ON gatherings FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
  END IF;
END $$;

-- 1-17. community_reports: RLS + 정책
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='community_reports') THEN
    ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_reports' AND policyname='service_all_community_reports') THEN
      EXECUTE 'CREATE POLICY service_all_community_reports ON community_reports FOR ALL TO service_role USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_reports' AND policyname='community_reports_insert_own') THEN
      EXECUTE 'CREATE POLICY community_reports_insert_own ON community_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
    END IF;
  END IF;
END $$;

-- ========== PART 2: 인덱스 최적화 ==========================================
-- 모든 인덱스: 테이블+컬럼 존재 확인 후 생성

DO $$
BEGIN
  -- portfolios(user_id, current_value)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='portfolios' AND column_name='current_value') THEN
    CREATE INDEX IF NOT EXISTS idx_portfolios_user_value ON portfolios(user_id, current_value DESC);
  END IF;

  -- community_posts 인덱스 3개
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_posts' AND column_name='category') THEN
    CREATE INDEX IF NOT EXISTS idx_community_posts_category_pinned_created ON community_posts(category, is_pinned DESC NULLS LAST, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_posts' AND column_name='likes_count') THEN
    CREATE INDEX IF NOT EXISTS idx_community_posts_likes_desc ON community_posts(likes_count DESC, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_posts' AND column_name='comments_count') THEN
    CREATE INDEX IF NOT EXISTS idx_community_posts_comments_desc ON community_posts(comments_count DESC, created_at DESC);
  END IF;

  -- community_likes(user_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='community_likes') THEN
    CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_likes(user_id);
  END IF;

  -- rebalance_executions(user_id, executed_at)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rebalance_executions' AND column_name='executed_at') THEN
    CREATE INDEX IF NOT EXISTS idx_rebalance_executions_user_executed ON rebalance_executions(user_id, executed_at DESC);
  END IF;

  -- ai_chat_messages(user_id, role, created_at)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_chat_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_role ON ai_chat_messages(user_id, role, created_at DESC);
  END IF;

  -- ai_feature_results(user_id, created_at)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_feature_results') THEN
    CREATE INDEX IF NOT EXISTS idx_ai_feature_results_user_created ON ai_feature_results(user_id, created_at DESC);
  END IF;

  -- credit_transactions(type, created_at)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='credit_transactions' AND column_name='type') THEN
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_type_created ON credit_transactions(type, created_at DESC);
  END IF;

  -- analytics_events(user_id, created_at)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
  END IF;

  -- profiles(created_at), profiles(email) - 컬럼 존재 시에만
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;

  -- realestate_price_cache
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='realestate_price_cache' AND column_name='lawd_cd') THEN
    CREATE INDEX IF NOT EXISTS idx_realestate_cache_full_lookup ON realestate_price_cache(lawd_cd, complex_name, unit_area, updated_at DESC);
  END IF;

  -- prediction_votes(user_id, created_at)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prediction_votes') THEN
    CREATE INDEX IF NOT EXISTS idx_prediction_votes_user_created ON prediction_votes(user_id, created_at DESC);
  END IF;

  -- community_comments(user_id, created_at)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='community_comments') THEN
    CREATE INDEX IF NOT EXISTS idx_community_comments_user_created ON community_comments(user_id, created_at DESC);
  END IF;
END $$;

-- ========== PART 3: 데이터 무결성 강화 =====================================
-- 모든 ALTER TABLE: 테이블+컬럼 존재 확인

DO $$ BEGIN
  -- community_posts: DEFAULT NOW()
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_posts' AND column_name='created_at') THEN
    ALTER TABLE community_posts ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_posts' AND column_name='updated_at') THEN
    ALTER TABLE community_posts ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'community_posts DEFAULT 설정 스킵: %', SQLERRM;
END $$;

DO $$ BEGIN
  -- community_comments: NOT NULL + DEFAULT
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_comments' AND column_name='created_at') THEN
    UPDATE community_comments SET created_at = NOW() WHERE created_at IS NULL;
    ALTER TABLE community_comments ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE community_comments ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'community_comments 수정 스킵: %', SQLERRM;
END $$;

DO $$ BEGIN
  -- deposit_events: DEFAULT NOW()
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deposit_events' AND column_name='created_at') THEN
    ALTER TABLE deposit_events ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'deposit_events 수정 스킵: %', SQLERRM;
END $$;

DO $$ BEGIN
  -- edge_function_logs: DEFAULT NOW()
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='edge_function_logs' AND column_name='executed_at') THEN
    ALTER TABLE edge_function_logs ALTER COLUMN executed_at SET DEFAULT NOW();
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'edge_function_logs 수정 스킵: %', SQLERRM;
END $$;

DO $$ BEGIN
  -- user_goals: user_id NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_goals' AND column_name='user_id') THEN
    DELETE FROM user_goals WHERE user_id IS NULL;
    ALTER TABLE user_goals ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'user_goals 수정 스킵: %', SQLERRM;
END $$;

DO $$ BEGIN
  -- referral_pending_rewards: created_at DEFAULT + NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referral_pending_rewards' AND column_name='created_at') THEN
    ALTER TABLE referral_pending_rewards ALTER COLUMN created_at SET DEFAULT NOW();
    UPDATE referral_pending_rewards SET created_at = NOW() WHERE created_at IS NULL;
    ALTER TABLE referral_pending_rewards ALTER COLUMN created_at SET NOT NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'referral_pending_rewards 수정 스킵: %', SQLERRM;
END $$;

DO $$ BEGIN
  -- prediction_polls: DEFAULT NOW()
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prediction_polls' AND column_name='created_at') THEN
    ALTER TABLE prediction_polls ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'prediction_polls 수정 스킵: %', SQLERRM;
END $$;

-- updated_at 자동 갱신 함수 생성 (없으면 새로 만들기)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 갱신 트리거
DO $$ BEGIN
  IF TRUE THEN

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
      DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
      CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_posts' AND column_name='updated_at') THEN
      DROP TRIGGER IF EXISTS trigger_community_posts_updated_at ON community_posts;
      CREATE TRIGGER trigger_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_credits' AND column_name='updated_at') THEN
      DROP TRIGGER IF EXISTS trigger_user_credits_updated_at ON user_credits;
      CREATE TRIGGER trigger_user_credits_updated_at BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='realestate_price_cache' AND column_name='updated_at') THEN
      DROP TRIGGER IF EXISTS trigger_realestate_cache_updated_at ON realestate_price_cache;
      CREATE TRIGGER trigger_realestate_cache_updated_at BEFORE UPDATE ON realestate_price_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

  END IF;
END $$;

-- ========== PART 4: PostgREST 스키마 캐시 갱신 ============================
SELECT pg_notify('pgrst', 'reload schema');
