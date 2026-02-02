/**
 * Supabase 데이터베이스 타입 정의
 * Web과 App 간 공유하는 데이터 스키마
 */

export interface Database {
  public: {
    Tables: {
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          current_value: number;
          target_allocation: number;
          asset_type: 'liquid' | 'illiquid';
          ticker: string | null;
          quantity: number | null;
          avg_price: number | null;
          current_price: number | null;
          cost_basis: number | null;
          purchase_date: string | null;
          custom_tax_rate: number | null;
          currency: string;
          notes: string | null;
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
          quantity?: number | null;
          avg_price?: number | null;
          current_price?: number | null;
          cost_basis?: number | null;
          purchase_date?: string | null;
          custom_tax_rate?: number | null;
          currency?: string;
          notes?: string | null;
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
          quantity?: number | null;
          avg_price?: number | null;
          current_price?: number | null;
          cost_basis?: number | null;
          purchase_date?: string | null;
          custom_tax_rate?: number | null;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
