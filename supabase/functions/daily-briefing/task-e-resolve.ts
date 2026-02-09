// @ts-nocheck
// ============================================================================
// Task E-2: 예측 정답 판정 (Prediction Resolution)
// 어제 질문의 정답을 Gemini로 판정하고 크레딧 보상
//
// [흐름]
// 1. deadline이 지난 active/closed 투표 조회
// 2. Gemini + Google Search로 정답 판정 (confidence 60% 이상)
// 3. resolve_poll() RPC 호출 → 적중자에게 크레딧 지급
// 4. confidence 60% 미만이면 다음 배치로 보류
//
// [보상 로직]
// - 적중: 2크레딧 (구독자는 4크레딧)
// - 5연속 적중: +3 크레딧 보너스
// - 10연속 적중: +10 크레딧 보너스
// - 오답: 연속 적중 리셋
// ============================================================================

import {
  supabase,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface PredictionResolutionResult {
  resolved: number;
  deferred: number;
}

// ============================================================================
// E-2: 예측 정답 판정
// ============================================================================

/**
 * Task E-2: 만료된 투표 정답 판정
 *
 * [판정 기준]
 * - deadline이 지난 투표만 대상
 * - Gemini의 confidence가 60% 이상일 때만 판정
 * - confidence < 60%이면 다음 배치로 보류 (status → 'closed')
 *
 * [정답 판정 프로세스]
 * 1. Gemini에게 Google Search로 최신 데이터 검색 요청
 * 2. YES/NO 판정 + confidence (0-100) + source (출처)
 * 3. confidence 60+ → resolve_poll() RPC 호출
 * 4. RPC 내부에서 적중자에게 크레딧 자동 지급
 *
 * [보상 로직 (RPC에서 처리)]
 * - 기본 보상: 2크레딧 (구독자는 2배 → 4크레딧)
 * - 연속 적중 보너스:
 *   - 5연속 → +3 크레딧
 *   - 10연속 → +10 크레딧
 * - 오답 시 연속 적중 리셋
 *
 * [Rate Limit]
 * - 투표마다 1초 딜레이 (Gemini API 부하 방지)
 *
 * @returns { resolved, deferred }
 */
export async function resolvePredictionPolls(): Promise<PredictionResolutionResult> {
  const startTime = Date.now();

  try {
    // 마감 지난 미판정 투표 조회
    const { data: expiredPolls, error } = await supabase
      .from('prediction_polls')
      .select('*')
      .in('status', ['active', 'closed'])
      .lt('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(10);

    if (error || !expiredPolls || expiredPolls.length === 0) {
      console.log('[Task E-2] 판정 대상 투표 없음');
      const elapsed = Date.now() - startTime;
      await logTaskResult('resolve', 'SUCCESS', elapsed, { resolved: 0, deferred: 0 });
      return { resolved: 0, deferred: 0 };
    }

  console.log(`[Task E-2] ${expiredPolls.length}개 투표 정답 판정 시작...`);

  let resolved = 0;
  let deferred = 0;

  for (const poll of expiredPolls) {
    try {
      const judgmentPrompt = `
당신은 투자 예측 판정관입니다. 다음 예측 질문의 정답을 판정하세요.

**질문:** ${poll.question}
**설명:** ${poll.description || '없음'}
**카테고리:** ${poll.category}
**마감 시간:** ${poll.deadline}

**[중요] Google Search로 최신 데이터를 검색하여 정답을 확인하세요.**

**출력 형식 (JSON만):**
{
  "answer": "YES" 또는 "NO",
  "confidence": 0-100,
  "source": "판정 근거 출처 (뉴스 사이트명, 데이터 출처)",
  "reasoning": "판정 이유 한 줄"
}
`;

      const responseText = await callGeminiWithSearch(judgmentPrompt);
      const cleanJson = cleanJsonResponse(responseText);
      const judgment = JSON.parse(cleanJson);

      // confidence 60 미만이면 보류
      if (!judgment.confidence || judgment.confidence < 60) {
        console.log(`[Task E-2] "${poll.question}" confidence ${judgment.confidence} → 보류`);
        // 상태를 closed로 변경 (다음 배치에서 재시도)
        await supabase
          .from('prediction_polls')
          .update({ status: 'closed' })
          .eq('id', poll.id);
        deferred++;
        continue;
      }

      // 정답 판정: resolve_poll RPC 호출
      const correctAnswer = judgment.answer === 'YES' ? 'YES' : 'NO';
      const source = `${judgment.source || ''}${judgment.reasoning ? ' — ' + judgment.reasoning : ''}`;

      const { data: resolveResult, error: resolveError } = await supabase.rpc('resolve_poll', {
        p_poll_id: poll.id,
        p_correct_answer: correctAnswer,
        p_source: source,
      });

      if (resolveError) {
        console.error(`[Task E-2] resolve_poll 실패:`, resolveError);
      } else {
        const result = resolveResult?.[0];
        console.log(`[Task E-2] "${poll.question}" → ${correctAnswer} (${result?.voters_rewarded || 0}명 보상, ${result?.total_credits || 0}C)`);
        resolved++;
      }
    } catch (pollError) {
      console.error(`[Task E-2] 개별 투표 판정 실패:`, pollError);
      deferred++;
    }

    // Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[Task E-2] 판정 완료: ${resolved}건 해결, ${deferred}건 보류`);

  const elapsed = Date.now() - startTime;
  await logTaskResult('resolve', 'SUCCESS', elapsed, { resolved, deferred });

  return { resolved, deferred };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('resolve', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
