/**
 * Supabase 데이터베이스 타입 정의
 * Web과 App 간 공유하는 데이터 스키마
 */

export interface Database {
  public: {
    Tables: {
      // 사용자 프로필 테이블
      // NOTE: plan_type과 is_verified는 수익화 로드맵용 (월 50만원 목표)
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          provider: 'email' | 'google' | 'kakao' | 'apple' | null;
          // 수익화 관련 필드
          plan_type: 'free' | 'premium' | 'vip';
          is_verified: boolean; // VIP 라운지 입장 자격 (검증된 자산 보유)
          verified_total_assets: number | null; // 검증된 총 자산 (KRW)
          premium_expires_at: string | null; // 프리미엄 만료일
          // 자산 티어링 필드 (자동 계산)
          total_assets: number; // 전체 자산 합계 (portfolios 테이블 sum)
          tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'; // 자산 기반 티어
          tier_updated_at: string | null; // 티어 마지막 업데이트
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          provider?: 'email' | 'google' | 'kakao' | 'apple' | null;
          plan_type?: 'free' | 'premium' | 'vip';
          is_verified?: boolean;
          verified_total_assets?: number | null;
          premium_expires_at?: string | null;
          total_assets?: number;
          tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          tier_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          provider?: 'email' | 'google' | 'kakao' | 'apple' | null;
          plan_type?: 'free' | 'premium' | 'vip';
          is_verified?: boolean;
          verified_total_assets?: number | null;
          premium_expires_at?: string | null;
          total_assets?: number;
          tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          tier_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // 포트폴리오/자산 테이블
      // IMPORTANT: quantity는 DB에서 DECIMAL(18,8)로 설정 필요 (소수점 주식 지원: 229.4주, 51.9주)
      // IMPORTANT: current_value는 항상 화면에 표시된 KRW 값 사용 (외부 환율 API 변환 금지)
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          current_value: number; // 항상 KRW (화면 표시 값 그대로)
          target_allocation: number;
          asset_type: 'liquid' | 'illiquid';
          ticker: string | null;
          quantity: number | null; // DECIMAL - 소수점 지원 (fractional shares)
          avg_price: number | null; // KRW 기준
          current_price: number | null; // KRW 기준
          cost_basis: number | null;
          purchase_date: string | null;
          custom_tax_rate: number | null;
          currency: 'KRW' | 'USD' | 'EUR' | 'JPY'; // 원본 통화 (참조용)
          display_currency: 'KRW'; // 표시 통화는 항상 KRW
          notes: string | null;
          // 검증 관련 필드
          is_verified: boolean;
          verified_at: string | null;
          verified_value: number | null; // 검증 당시 KRW 가치
          input_type: 'self_declared' | 'ocr_verified';
          // 부동산 메타데이터 (ticker가 RE_로 시작하는 자산)
          lawd_cd: string | null;
          complex_name: string | null;
          unit_area: number | null;
          unit_detail: string | null;
          purchase_price_krw: number | null;
          last_price_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          current_value: number;
          target_allocation?: number;
          asset_type?: 'liquid' | 'illiquid';
          ticker?: string | null;
          quantity?: number | null; // 소수점 허용 (fractional shares)
          avg_price?: number | null;
          current_price?: number | null;
          cost_basis?: number | null;
          purchase_date?: string | null;
          custom_tax_rate?: number | null;
          currency?: 'KRW' | 'USD' | 'EUR' | 'JPY';
          display_currency?: 'KRW';
          notes?: string | null;
          is_verified?: boolean;
          verified_at?: string | null;
          verified_value?: number | null;
          input_type?: 'self_declared' | 'ocr_verified';
          // 부동산 메타데이터
          lawd_cd?: string | null;
          complex_name?: string | null;
          unit_area?: number | null;
          unit_detail?: string | null;
          purchase_price_krw?: number | null;
          last_price_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          current_value?: number;
          target_allocation?: number;
          asset_type?: 'liquid' | 'illiquid';
          ticker?: string | null;
          quantity?: number | null; // 소수점 허용 (fractional shares)
          avg_price?: number | null;
          current_price?: number | null;
          cost_basis?: number | null;
          purchase_date?: string | null;
          custom_tax_rate?: number | null;
          currency?: 'KRW' | 'USD' | 'EUR' | 'JPY';
          display_currency?: 'KRW';
          notes?: string | null;
          is_verified?: boolean;
          verified_at?: string | null;
          verified_value?: number | null;
          input_type?: 'self_declared' | 'ocr_verified';
          // 부동산 메타데이터
          lawd_cd?: string | null;
          complex_name?: string | null;
          unit_area?: number | null;
          unit_detail?: string | null;
          purchase_price_krw?: number | null;
          last_price_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // 모임/스터디 테이블 (VIP 라운지 마켓플레이스)
      gatherings: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string | null;
          category: 'study' | 'meeting' | 'networking' | 'workshop';
          entry_fee: number; // KRW (0 = 무료)
          max_capacity: number;
          current_capacity: number;
          event_date: string; // ISO 날짜/시간
          location: string;
          location_type: 'online' | 'offline';
          status: 'open' | 'closed' | 'cancelled' | 'completed';
          // 티어 기반 접근 제어 (TBAC)
          min_tier_required: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'; // 최소 입장 티어
          // 호스트 정보 스냅샷 (조인 최소화)
          host_display_name: string | null;
          host_verified_assets: number | null; // KRW
          host_tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          description?: string | null;
          category: 'study' | 'meeting' | 'networking' | 'workshop';
          entry_fee?: number;
          max_capacity: number;
          current_capacity?: number;
          event_date: string;
          location: string;
          location_type?: 'online' | 'offline';
          status?: 'open' | 'closed' | 'cancelled' | 'completed';
          min_tier_required?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          host_display_name?: string | null;
          host_verified_assets?: number | null;
          host_tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          title?: string;
          description?: string | null;
          category?: 'study' | 'meeting' | 'networking' | 'workshop';
          entry_fee?: number;
          max_capacity?: number;
          current_capacity?: number;
          event_date?: string;
          location?: string;
          location_type?: 'online' | 'offline';
          status?: 'open' | 'closed' | 'cancelled' | 'completed';
          min_tier_required?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          host_display_name?: string | null;
          host_verified_assets?: number | null;
          host_tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          created_at?: string;
          updated_at?: string;
        };
      };
      // 모임 참가자 테이블
      gathering_participants: {
        Row: {
          id: string;
          gathering_id: string;
          user_id: string;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled';
          paid_amount: number; // 실제 결제 금액 (MVP: 시뮬레이션)
          payment_status: 'pending' | 'completed' | 'refunded';
          // 참가자 정보 스냅샷
          participant_display_name: string | null;
          participant_verified_assets: number | null;
          participant_tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          applied_at: string;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gathering_id: string;
          user_id: string;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          paid_amount?: number;
          payment_status?: 'pending' | 'completed' | 'refunded';
          participant_display_name?: string | null;
          participant_verified_assets?: number | null;
          participant_tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          applied_at?: string;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gathering_id?: string;
          user_id?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          paid_amount?: number;
          payment_status?: 'pending' | 'completed' | 'refunded';
          participant_display_name?: string | null;
          participant_verified_assets?: number | null;
          participant_tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
          applied_at?: string;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // 자산 검증 기록 테이블
      asset_verifications: {
        Row: {
          id: string;
          user_id: string;
          portfolio_id: string;
          status: 'self_declared' | 'pending' | 'verified' | 'rejected';
          screenshot_url: string | null;
          ocr_extracted_total: number | null;
          ocr_extracted_items: any;
          calculated_total: number | null;
          discrepancy_percent: number | null;
          is_fraud_suspected: boolean;
          verified_at: string | null;
          verified_by: 'ai' | 'admin' | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          portfolio_id: string;
          status?: 'self_declared' | 'pending' | 'verified' | 'rejected';
          screenshot_url?: string | null;
          ocr_extracted_total?: number | null;
          ocr_extracted_items?: any;
          calculated_total?: number | null;
          discrepancy_percent?: number | null;
          is_fraud_suspected?: boolean;
          verified_at?: string | null;
          verified_by?: 'ai' | 'admin' | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          portfolio_id?: string;
          status?: 'self_declared' | 'pending' | 'verified' | 'rejected';
          screenshot_url?: string | null;
          ocr_extracted_total?: number | null;
          ocr_extracted_items?: any;
          calculated_total?: number | null;
          discrepancy_percent?: number | null;
          is_fraud_suspected?: boolean;
          verified_at?: string | null;
          verified_by?: 'ai' | 'admin' | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ============================================================================
      // AI 프리미엄 마켓플레이스 테이블
      // ============================================================================

      // 사용자 크레딧 잔액
      user_credits: {
        Row: {
          user_id: string;
          balance: number;
          lifetime_purchased: number;
          lifetime_spent: number;
          last_bonus_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          lifetime_purchased?: number;
          lifetime_spent?: number;
          last_bonus_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance?: number;
          lifetime_purchased?: number;
          lifetime_spent?: number;
          last_bonus_at?: string | null;
          updated_at?: string;
        };
      };
      // 크레딧 거래 원장
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'purchase' | 'spend' | 'refund' | 'bonus' | 'subscription_bonus';
          amount: number;
          balance_after: number;
          feature_type: 'deep_dive' | 'what_if' | 'tax_report' | 'ai_cfo_chat' | null;
          feature_ref_id: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'purchase' | 'spend' | 'refund' | 'bonus' | 'subscription_bonus';
          amount: number;
          balance_after: number;
          feature_type?: 'deep_dive' | 'what_if' | 'tax_report' | 'ai_cfo_chat' | null;
          feature_ref_id?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'purchase' | 'spend' | 'refund' | 'bonus' | 'subscription_bonus';
          amount?: number;
          balance_after?: number;
          feature_type?: 'deep_dive' | 'what_if' | 'tax_report' | 'ai_cfo_chat' | null;
          feature_ref_id?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
      // AI 분석 결과 캐시 (24시간)
      ai_feature_results: {
        Row: {
          id: string;
          user_id: string;
          feature_type: 'deep_dive' | 'what_if' | 'tax_report';
          input_hash: string;
          result: Record<string, any>;
          credits_charged: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          feature_type: 'deep_dive' | 'what_if' | 'tax_report';
          input_hash: string;
          result: Record<string, any>;
          credits_charged: number;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          feature_type?: 'deep_dive' | 'what_if' | 'tax_report';
          input_hash?: string;
          result?: Record<string, any>;
          credits_charged?: number;
          expires_at?: string;
          created_at?: string;
        };
      };
      // AI CFO 채팅 히스토리
      ai_chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          credits_charged: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          credits_charged?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          credits_charged?: number;
          created_at?: string;
        };
      };
      // 커뮤니티 게시물 테이블 (VIP 라운지)
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          display_tag: string;              // "[자산: 1.2억 / 수익: 0.3억]"
          asset_mix: string | null;         // "Tech 70%, Crypto 30%"
          content: string;
          likes_count: number;
          total_assets_at_post: number;     // 작성 시점 자산 스냅샷
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_tag: string;
          asset_mix?: string | null;
          content: string;
          likes_count?: number;
          total_assets_at_post: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_tag?: string;
          asset_mix?: string | null;
          content?: string;
          likes_count?: number;
          total_assets_at_post?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// 편의 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Portfolio = Database['public']['Tables']['portfolios']['Row'];
export type AssetVerification = Database['public']['Tables']['asset_verifications']['Row'];
export type Gathering = Database['public']['Tables']['gatherings']['Row'];
export type GatheringInsert = Database['public']['Tables']['gatherings']['Insert'];
export type GatheringUpdate = Database['public']['Tables']['gatherings']['Update'];
export type GatheringParticipant = Database['public']['Tables']['gathering_participants']['Row'];
export type GatheringParticipantInsert = Database['public']['Tables']['gathering_participants']['Insert'];
export type CommunityPostRow = Database['public']['Tables']['community_posts']['Row'];
export type CommunityPostInsert = Database['public']['Tables']['community_posts']['Insert'];

// 모임 카테고리 라벨
export const GATHERING_CATEGORY_LABELS: Record<Gathering['category'], string> = {
  study: '스터디',
  meeting: '정기 모임',
  networking: '네트워킹',
  workshop: '워크샵',
};

// 마켓플레이스 편의 타입
export type UserCreditsRow = Database['public']['Tables']['user_credits']['Row'];
export type CreditTransactionRow = Database['public']['Tables']['credit_transactions']['Row'];
export type AIFeatureResultRow = Database['public']['Tables']['ai_feature_results']['Row'];
export type AIChatMessageRow = Database['public']['Tables']['ai_chat_messages']['Row'];

// 티어 타입 (4단계 전략적 티어)
export type UserTier = 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
