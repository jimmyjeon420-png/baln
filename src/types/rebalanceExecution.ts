/**
 * 리밸런싱 실행 기록 타입 정의
 *
 * 비유: "매매 일지" — AI가 제안한 액션을 실제로 실행했을 때의 기록
 */

export interface RebalanceExecution {
  id: string;
  user_id: string;

  // 제안 정보
  prescription_date: string;        // YYYY-MM-DD
  action_ticker: string;
  action_name: string;
  action_type: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  suggested_price: number | null;
  suggested_qty: number | null;

  // 실행 정보
  executed_at: string;              // ISO 8601
  executed_price: number;
  executed_qty: number;
  execution_note: string | null;

  // 결과 (나중에 계산)
  result_gain_loss: number | null;
  result_gain_pct: number | null;

  created_at: string;
}

export interface ExecutionInput {
  prescription_date: string;
  action_ticker: string;
  action_name: string;
  action_type: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  suggested_price: number | null;
  suggested_qty: number | null;
  executed_at: Date;
  executed_price: number;
  executed_qty: number;
  execution_note?: string;
}

export interface ExecutionSummary {
  total_count: number;
  buy_count: number;
  sell_count: number;
  total_gain_loss: number;
  avg_gain_pct: number;
}
