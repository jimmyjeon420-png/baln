/**
 * 구루 AI 댓글 타입 정의
 *
 * community_guru_comments 테이블과 1:1 매핑
 * 구루가 게시물에 자동으로 다는 AI 댓글 (human 댓글과 분리)
 */

/** 구루 댓글 감정 */
export type GuruCommentSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';

/** 구루 AI 댓글 */
export interface GuruComment {
  id: string;
  post_id: string;
  guru_id: string;
  content: string;
  content_en?: string;
  sentiment: GuruCommentSentiment;
  created_at: string;
  /** 답글 대상 구루 ID (라이벌 토론용) */
  reply_to_guru_id?: string;
}
