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

function sanitizeLine(value: unknown, maxLength = 220): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildResolutionSource(
  correctAnswer: 'YES' | 'NO',
  confidence: number,
  judgment: {
    source?: string;
    reasoning?: string;
    observed_value?: string;
    threshold_check?: string;
    yes_case?: string;
    no_case?: string;
    learning_point?: string;
  },
): string {
  const lines: string[] = [
    `판정결론: ${correctAnswer} (신뢰도 ${Math.round(confidence)}%)`,
  ];

  const observedValue = sanitizeLine(judgment.observed_value, 180);
  const thresholdCheck = sanitizeLine(judgment.threshold_check, 180);
  const reasoning = sanitizeLine(judgment.reasoning, 200);
  const yesCase = sanitizeLine(judgment.yes_case, 220);
  const noCase = sanitizeLine(judgment.no_case, 220);
  const learningPoint = sanitizeLine(judgment.learning_point, 220);
  const source = sanitizeLine(judgment.source, 120);

  if (observedValue) lines.push(`관측데이터: ${observedValue}`);
  if (thresholdCheck) lines.push(`조건검증: ${thresholdCheck}`);
  if (reasoning) lines.push(`핵심근거: ${reasoning}`);
  if (yesCase) lines.push(`YES 시나리오: ${yesCase}`);
  if (noCase) lines.push(`NO 시나리오: ${noCase}`);
  if (learningPoint) lines.push(`학습포인트: ${learningPoint}`);
  if (source) lines.push(`출처: ${source}`);

  return lines.join('\n');
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
  const MAX_POLLS_PER_RUN = 3;

  try {
    // 마감 지난 미판정 투표 조회
    const { data: expiredPolls, error } = await supabase
      .from('prediction_polls')
      .select('*')
      .in('status', ['active', 'closed'])
      .lt('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(MAX_POLLS_PER_RUN);

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
	      const judgmentPrompt = `당신은 baln(발른) 앱의 예측 판정 AI입니다.
아래 예측 질문의 정답을 객관적 데이터에 기반하여 판정하세요.

[질문] ${poll.question}
[설명] ${poll.description || '없음'}
[카테고리] ${poll.category}
[마감 시간] ${poll.deadline}

[판정 원칙]
- Google Search로 실제 시장 데이터(종가, 가격 등)를 검색하여 사실 확인한다.
- 데이터가 불충분하면 confidence를 낮게(60 미만) 설정하여 보류 처리한다.
- 추측으로 판정하지 않는다.
- 반드시 "관측값(실제 수치)"와 "질문 기준선 충족 여부"를 분리해서 설명한다.
- YES/NO 각각 어떤 조건에서 성립 또는 실패했는지 논리적으로 작성한다.

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운 금지.]
{
  "answer": "YES 또는 NO",
  "confidence": 75,
  "source": "주요 데이터 출처 (예: Yahoo Finance, Bloomberg)",
  "observed_value": "실제 관측값 (예: 마감가 5,812.34)",
  "threshold_check": "질문 기준선 충족 여부 (예: 5,900 미달)",
  "reasoning": "정답 판단 핵심 1문장",
  "yes_case": "YES 시나리오가 성립/실패한 이유",
  "no_case": "NO 시나리오가 성립/실패한 이유",
  "learning_point": "다음 예측에서 확인할 핵심 지표 1문장"
}
`;

	      let judgment: {
	        answer?: string;
	        confidence?: number;
	        source?: string;
	        reasoning?: string;
	        observed_value?: string;
	        threshold_check?: string;
	        yes_case?: string;
	        no_case?: string;
	        learning_point?: string;
	      };
	      try {
	        const responseText = await callGeminiWithSearch(judgmentPrompt);
	        const cleanJson = cleanJsonResponse(responseText);
	        judgment = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn(`[Task E-2] "${poll.question}" Gemini 응답 파싱 실패 → 보류:`, parseErr);
        deferred++;
        continue;
      }

	      const confidence = Number(judgment.confidence ?? 0);

	      // confidence 60 미만이면 보류
	      if (!Number.isFinite(confidence) || confidence < 60) {
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
	      const source = buildResolutionSource(correctAnswer, confidence, judgment);

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
