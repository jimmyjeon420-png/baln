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
    };
  };
}
