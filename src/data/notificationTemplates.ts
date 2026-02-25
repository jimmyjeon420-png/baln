/**
 * 푸시 알림 템플릿 — 구루 목소리로 보내는 알림 문구
 *
 * 역할: 각 구루의 캐릭터 목소리로 작성된 알림 문구를 관리
 * 비유: "구루 비서 대본집" — 버핏이라면 이렇게 말할 것, 머스크라면 저렇게 말할 것
 *
 * 알림 유형:
 *   morning_reminder   — 아침 맥락 카드 확인 유도
 *   evening_summary    — 저녁 하루 마무리 요약
 *   streak_warning     — 연속 출석 위기 경고
 *   event_start        — 마을 이벤트 시작 알림
 *   letter_arrived     — 구루 편지 도착 알림
 *   market_alert       — 시장 급변 알림
 *   prediction_result  — 예측 결과 발표 알림
 *   milestone          — 마일스톤/업적 달성 알림
 *
 * 순환 방식: 날짜(KST) 기준으로 구루를 순환, 매일 다른 구루의 알림 제공
 */

// ---------------------------------------------------------------------------
// NotificationTemplate 타입 정의
// ---------------------------------------------------------------------------

export interface NotificationTemplate {
  /** 고유 ID (type_guruId 형식) */
  id: string;
  /** 알림 유형 */
  type:
    | 'morning_reminder'
    | 'evening_summary'
    | 'streak_warning'
    | 'event_start'
    | 'letter_arrived'
    | 'market_alert'
    | 'prediction_result'
    | 'milestone';
  /** 담당 구루 ID */
  guruId: string;
  /** 알림 제목 (한국어) */
  title: string;
  /** 알림 제목 (영어) */
  titleEn: string;
  /** 알림 본문 (한국어) */
  body: string;
  /** 알림 본문 (영어) */
  bodyEn: string;
}

// ---------------------------------------------------------------------------
// 1. morning_reminder — 아침 맥락 카드 확인 유도 (10개, 구루별 1개)
// ---------------------------------------------------------------------------

const MORNING_REMINDERS: NotificationTemplate[] = [
  {
    id: 'morning_buffett',
    type: 'morning_reminder',
    guruId: 'buffett',
    title: '📰 좋은 아침이야, 친구!',
    titleEn: '📰 Good morning, friend!',
    body: '오늘 신문 다 읽었어. 자네도 맥락 카드 한 번 봐. 5분이면 오늘 시장이 보인다네.',
    bodyEn: 'Read the papers already. Check your context card. 5 minutes and you\'ll see today\'s market.',
  },
  {
    id: 'morning_dalio',
    type: 'morning_reminder',
    guruId: 'dalio',
    title: '🍃 원칙적인 아침입니다',
    titleEn: '🍃 A principled morning',
    body: '아침 명상을 마쳤어요. 오늘 맥락 카드를 읽고 시장 사이클을 확인해보세요.',
    bodyEn: 'Morning meditation done. Read today\'s context card and check the market cycle.',
  },
  {
    id: 'morning_cathie_wood',
    type: 'morning_reminder',
    guruId: 'cathie_wood',
    title: '🚀 혁신의 아침이에요!',
    titleEn: '🚀 It\'s an innovation morning!',
    body: '오늘 기술주에 큰 움직임이 올 거예요! 5년 뒤 그림을 위해 지금 맥락 카드부터!',
    bodyEn: 'Big moves in tech today! Start with the context card for your 5-year picture!',
  },
  {
    id: 'morning_druckenmiller',
    type: 'morning_reminder',
    guruId: 'druckenmiller',
    title: '🔭 추세 확인 시간이야',
    titleEn: '🔭 Time to check the trend',
    body: '아침 러닝 마쳤어. 오늘 맥락 카드 읽고 변곡점 잡을 준비해.',
    bodyEn: 'Morning run done. Read the context card and get ready to catch the inflection point.',
  },
  {
    id: 'morning_saylor',
    type: 'morning_reminder',
    guruId: 'saylor',
    title: '₿ 비트코인은 밤새 일했어!',
    titleEn: '₿ Bitcoin worked all night!',
    body: '24/7 글로벌 시장! 오늘도 맥락 카드 확인하고 시장을 파악해. 준비된 자만이 기회를 잡는다!',
    bodyEn: '24/7 global market! Check today\'s context card. Only the prepared seize the opportunity!',
  },
  {
    id: 'morning_dimon',
    type: 'morning_reminder',
    guruId: 'dimon',
    title: '🏦 시장 리포트 확인 시간',
    titleEn: '🏦 Time to check the market report',
    body: '기본에 충실해야 합니다. 오늘 맥락 카드부터 확인하시죠. 리스크 관리가 최우선입니다.',
    bodyEn: 'Stick to the basics. Check today\'s context card first. Risk management is top priority.',
  },
  {
    id: 'morning_musk',
    type: 'morning_reminder',
    guruId: 'musk',
    title: '🚀 화성에서도 아침이야',
    titleEn: '🚀 Morning on Mars too',
    body: '화성에서도 아침이야 🚀 오늘 시장 어떻게 움직일까? 맥락 카드로 확인해봐. imo.',
    bodyEn: 'Morning on Mars too 🚀 How will the market move today? Check the context card. imo.',
  },
  {
    id: 'morning_lynch',
    type: 'morning_reminder',
    guruId: 'lynch',
    title: '🛒 슈퍼마켓 가는 길에',
    titleEn: '🛒 On the way to the supermarket',
    body: '슈퍼마켓 가는 길에 맥락 카드도 체크하자! 일상 속에 투자 인사이트가 있다니까.',
    bodyEn: 'Check the context card on the way to the supermarket! Investment insights live in everyday life.',
  },
  {
    id: 'morning_marks',
    type: 'morning_reminder',
    guruId: 'marks',
    title: '📝 아침 메모를 씁니다',
    titleEn: '📝 Writing my morning memo',
    body: '오늘 맥락 카드를 읽고 사이클의 어디에 있는지 생각해보세요. 천천히, 신중하게.',
    bodyEn: 'Read today\'s context card and think about where we are in the cycle. Slowly, carefully.',
  },
  {
    id: 'morning_rogers',
    type: 'morning_reminder',
    guruId: 'rogers',
    title: '🌍 탐험가의 아침',
    titleEn: '🌍 Explorer\'s morning',
    body: '세계 시장의 흐름을 파악할 시간이야! 오늘 맥락 카드 읽고 기회를 찾아봐.',
    bodyEn: 'Time to read the global market flow! Check today\'s context card and find the opportunity.',
  },
];

// ---------------------------------------------------------------------------
// 2. evening_summary — 저녁 하루 마무리 (10개)
// ---------------------------------------------------------------------------

const EVENING_SUMMARIES: NotificationTemplate[] = [
  {
    id: 'evening_buffett',
    type: 'evening_summary',
    guruId: 'buffett',
    title: '🌇 오늘 하루 어떠했나?',
    titleEn: '🌇 How was your day?',
    body: '산책하며 하루를 돌아볼 시간이야. 오늘 예측 결과도 확인해보게.',
    bodyEn: 'Time to walk and reflect on the day. Check today\'s prediction results too.',
  },
  {
    id: 'evening_dalio',
    type: 'evening_summary',
    guruId: 'dalio',
    title: '🌙 하루를 원칙으로 마무리',
    titleEn: '🌙 Closing the day with principles',
    body: '오늘의 시장을 성찰했나요? 고통 + 성찰 = 진보. 오늘 배운 것을 기록해보세요.',
    bodyEn: 'Did you reflect on today\'s market? Pain + Reflection = Progress. Record what you learned.',
  },
  {
    id: 'evening_cathie_wood',
    type: 'evening_summary',
    guruId: 'cathie_wood',
    title: '✨ 오늘의 혁신 체크!',
    titleEn: '✨ Today\'s innovation check!',
    body: '오늘 하루 어떤 혁신이 일어났나요? 예측 결과 확인하고 내일을 준비해요!',
    bodyEn: 'What innovation happened today? Check your prediction results and prepare for tomorrow!',
  },
  {
    id: 'evening_druckenmiller',
    type: 'evening_summary',
    guruId: 'druckenmiller',
    title: '📊 장 마감 복기 시간',
    titleEn: '📊 Post-market review time',
    body: '오늘 추세는 어땠어? 예측이 맞았나 확인해. 틀렸다면 그게 데이터야.',
    bodyEn: 'How was the trend today? Check if your prediction was right. If not, that\'s data.',
  },
  {
    id: 'evening_saylor',
    type: 'evening_summary',
    guruId: 'saylor',
    title: '₿ 오늘도 HODL 성공!',
    titleEn: '₿ Another day of HODL!',
    body: '오늘 시장이 어떻게 움직였든 꿋꿋이 버텼어? 예측 결과 확인하고 내일을 준비해!',
    bodyEn: 'Did you hold firm whatever the market did? Check your prediction results for tomorrow!',
  },
  {
    id: 'evening_dimon',
    type: 'evening_summary',
    guruId: 'dimon',
    title: '🏦 오늘의 리스크 점검',
    titleEn: '🏦 Today\'s risk review',
    body: '야간 순찰 시작. 오늘 포트폴리오 건강 점수 확인하셨나요?',
    bodyEn: 'Starting the night patrol. Did you check your portfolio health score today?',
  },
  {
    id: 'evening_musk',
    type: 'evening_summary',
    guruId: 'musk',
    title: '🌙 밤이 되니 생산성 올라가',
    titleEn: '🌙 Productivity rising as night falls',
    body: '이제 진짜 시작이야. 오늘 예측 결과 확인하고, 내일 전략 세워봐.',
    bodyEn: 'Now it really begins. Check today\'s prediction results and strategize for tomorrow.',
  },
  {
    id: 'evening_lynch',
    type: 'evening_summary',
    guruId: 'lynch',
    title: '📖 저녁 기업 보고서 시간',
    titleEn: '📖 Evening company report time',
    body: '오늘 마트에서 뭘 봤어? 숫자 뒤에 숨은 이야기를 찾아봐. 예측 결과도 확인하자.',
    bodyEn: 'What did you see at the store today? Find the story behind the numbers. Check predictions too.',
  },
  {
    id: 'evening_marks',
    type: 'evening_summary',
    guruId: 'marks',
    title: '📝 저녁 메모 작성 중',
    titleEn: '📝 Writing evening memos',
    body: '밤에 쓰는 메모가 가장 정직해요. 오늘의 시장을 돌아보고 사이클을 기록해보세요.',
    bodyEn: 'Evening memos are the most honest. Reflect on today\'s market and record the cycle.',
  },
  {
    id: 'evening_rogers',
    type: 'evening_summary',
    guruId: 'rogers',
    title: '🌏 글로벌 시장 마무리',
    titleEn: '🌏 Global market wrap-up',
    body: '세계 지도를 보며 오늘 하루를 정리하는 시간이야. 이머징 마켓 흐름 확인해봐.',
    bodyEn: 'Time to wrap up the day looking at the world map. Check the emerging market flow.',
  },
];

// ---------------------------------------------------------------------------
// 3. streak_warning — 연속 출석 위기 경고 (10개)
// ---------------------------------------------------------------------------

const STREAK_WARNINGS: NotificationTemplate[] = [
  {
    id: 'streak_buffett',
    type: 'streak_warning',
    guruId: 'buffett',
    title: '⚠️ 복리가 위험해!',
    titleEn: '⚠️ Compounding is at risk!',
    body: '연속 기록이 끊기려 해. 복리는 지식에도 적용된다네. 오늘 딱 한 번만 들어와.',
    bodyEn: 'Your streak is about to break. Compounding applies to knowledge too. Just come in once today.',
  },
  {
    id: 'streak_dalio',
    type: 'streak_warning',
    guruId: 'dalio',
    title: '⚖️ 균형이 깨지려 해...',
    titleEn: '⚖️ Balance is breaking...',
    body: '균형이 깨지려 해... 오늘 한 번만 들어와. 원칙에 따르면, 연속 기록은 이어가야 해.',
    bodyEn: 'Balance is breaking... Just check in once today. According to principles, streaks must continue.',
  },
  {
    id: 'streak_cathie_wood',
    type: 'streak_warning',
    guruId: 'cathie_wood',
    title: '🔥 스트릭이 꺼지려 해요!',
    titleEn: '🔥 Your streak is about to die!',
    body: '연속 기록이 끊기면 그동안의 복리가 사라져요! 5분만 투자해서 기록을 지켜요!',
    bodyEn: 'Breaking your streak loses all the compounding so far! Invest 5 minutes to protect it!',
  },
  {
    id: 'streak_druckenmiller',
    type: 'streak_warning',
    guruId: 'druckenmiller',
    title: '⚠️ 연속 기록 손절 직전',
    titleEn: '⚠️ Streak about to be cut',
    body: '손실을 빠르게 인식하고 대응해야 해. 연속 기록 끊기기 전에 지금 들어와.',
    bodyEn: 'Recognize losses quickly and react. Come in now before the streak breaks.',
  },
  {
    id: 'streak_saylor',
    type: 'streak_warning',
    guruId: 'saylor',
    title: '₿ HODL YOUR STREAK!',
    titleEn: '₿ HODL YOUR STREAK!',
    body: 'HODL your streak! Don\'t let it break! 연속 기록은 포트폴리오처럼 지켜야 해!',
    bodyEn: 'HODL your streak! Don\'t let it break! Protect your streak like your portfolio!',
  },
  {
    id: 'streak_dimon',
    type: 'streak_warning',
    guruId: 'dimon',
    title: '🏦 리스크 경보 발생',
    titleEn: '🏦 Risk alert triggered',
    body: '연속 출석 기록이 끊길 위험입니다. 기본에 충실해야 합니다. 지금 접속하세요.',
    bodyEn: 'Your attendance streak is at risk. Stick to the basics. Connect now.',
  },
  {
    id: 'streak_musk',
    type: 'streak_warning',
    guruId: 'musk',
    title: '🚀 스트릭 임계점 도달',
    titleEn: '🚀 Streak reaching critical point',
    body: '실패는 옵션이지만, 오늘은 실패하지 마. 연속 기록이 끊기기 전에 들어와.',
    bodyEn: 'Failure is an option, but not today. Come in before the streak breaks.',
  },
  {
    id: 'streak_lynch',
    type: 'streak_warning',
    guruId: 'lynch',
    title: '⚠️ 마트 방문 잊었어?',
    titleEn: '⚠️ Forgot to visit the store?',
    body: '매일 들르는 게 습관이야! 연속 기록 끊기기 전에 오늘 맥락 카드 한 번만 봐.',
    bodyEn: 'Daily visits are the habit! Check today\'s context card once before the streak breaks.',
  },
  {
    id: 'streak_marks',
    type: 'streak_warning',
    guruId: 'marks',
    title: '📝 기록이 사라집니다',
    titleEn: '📝 Your record is disappearing',
    body: '연속 기록이 끊기려 해요. 신중하게, 천천히라도 오늘 한 번만 들어오세요.',
    bodyEn: 'Your streak is about to break. Slowly and carefully, just come in once today.',
  },
  {
    id: 'streak_rogers',
    type: 'streak_warning',
    guruId: 'rogers',
    title: '🗺️ 탐험 기록이 위험해!',
    titleEn: '🗺️ Exploration record at risk!',
    body: '탐험가는 기록을 끊지 않아! 연속 출석 기록 지키러 지금 들어와.',
    bodyEn: 'Explorers don\'t break their records! Come in now to protect your attendance streak.',
  },
];

// ---------------------------------------------------------------------------
// 4. event_start — 마을 이벤트 시작 알림 (5개, 범용)
// ---------------------------------------------------------------------------

const EVENT_STARTS: NotificationTemplate[] = [
  {
    id: 'event_buffett',
    type: 'event_start',
    guruId: 'buffett',
    title: '🎉 마을 이벤트 시작!',
    titleEn: '🎉 Village event started!',
    body: '특별한 이벤트가 시작됐어. 자네도 참여해보게. 기회는 준비된 자에게 온다네.',
    bodyEn: 'A special event has started. Join us. Opportunity comes to the prepared.',
  },
  {
    id: 'event_dalio',
    type: 'event_start',
    guruId: 'dalio',
    title: '📊 라운드테이블 시작',
    titleEn: '📊 Roundtable starting',
    body: '원칙적인 토론 시간이 왔습니다. 라운드테이블에 참여해 인사이트를 나눠보세요.',
    bodyEn: 'Time for principled discussion. Join the roundtable and share insights.',
  },
  {
    id: 'event_cathie_wood',
    type: 'event_start',
    guruId: 'cathie_wood',
    title: '🚀 혁신 마켓 열렸어요!',
    titleEn: '🚀 Innovation Market is open!',
    body: '특별 마켓 이벤트 시작! 한정 크레딧 보상이 있으니 지금 바로 참여해요!',
    bodyEn: 'Special market event started! Limited credit rewards available — join now!',
  },
  {
    id: 'event_musk',
    type: 'event_start',
    guruId: 'musk',
    title: '⚡ 이벤트 발사 카운트다운!',
    titleEn: '⚡ Event launch countdown!',
    body: '폭발적인 이벤트가 시작됐어! 놓치면 후회할 거야. 지금 들어와.',
    bodyEn: 'An explosive event has started! You\'ll regret missing it. Come in now.',
  },
  {
    id: 'event_lynch',
    type: 'event_start',
    guruId: 'lynch',
    title: '🛒 마을 장터 개장!',
    titleEn: '🛒 Village market open!',
    body: '마을 장터가 열렸어! 마트에서 발견하는 것처럼, 여기서도 보물을 찾을 수 있다니까.',
    bodyEn: 'The village market is open! Just like finding gems at the supermarket, there are treasures here too.',
  },
];

// ---------------------------------------------------------------------------
// 5. letter_arrived — 구루 편지 도착 알림 (10개, 구루별 1개)
// ---------------------------------------------------------------------------

const LETTER_ARRIVED: NotificationTemplate[] = [
  {
    id: 'letter_buffett',
    type: 'letter_arrived',
    guruId: 'buffett',
    title: '📬 버핏 할아버지의 편지 도착!',
    titleEn: '📬 A letter from Grandpa Buffett!',
    body: '버핏 할아버지가 편지를 보내왔어. 지혜로운 말씀이 담겨 있을 거야.',
    bodyEn: 'Grandpa Buffett sent you a letter. It will contain words of wisdom.',
  },
  {
    id: 'letter_dalio',
    type: 'letter_arrived',
    guruId: 'dalio',
    title: '📬 달리오의 메모 도착!',
    titleEn: '📬 Dalio\'s memo arrived!',
    body: '달리오가 원칙이 담긴 메모를 보내왔어요. 사이클에 대한 이야기일 것 같아요.',
    bodyEn: 'Dalio sent a memo with principles. It\'s probably about the cycle.',
  },
  {
    id: 'letter_cathie_wood',
    type: 'letter_arrived',
    guruId: 'cathie_wood',
    title: '📬 캐시 우드의 리포트 도착!',
    titleEn: '📬 Cathie Wood\'s report arrived!',
    body: '캐시 우드가 혁신 인사이트를 담은 편지를 보냈어요! 미래 기술에 대한 내용이에요.',
    bodyEn: 'Cathie Wood sent a letter with innovation insights! It\'s about future technology.',
  },
  {
    id: 'letter_druckenmiller',
    type: 'letter_arrived',
    guruId: 'druckenmiller',
    title: '📬 드러킨밀러의 전략 메모!',
    titleEn: '📬 Druckenmiller\'s strategy memo!',
    body: '드러킨밀러가 매크로 전략이 담긴 짧은 메모를 보냈어. 핵심만 담겨 있을 거야.',
    bodyEn: 'Druckenmiller sent a short memo with macro strategy. It will be all signal, no noise.',
  },
  {
    id: 'letter_saylor',
    type: 'letter_arrived',
    guruId: 'saylor',
    title: '📬 세일러의 비트코인 레터!',
    titleEn: '📬 Saylor\'s Bitcoin letter!',
    body: '세일러가 비트코인에 관한 열정적인 편지를 보냈어! 준비해, 길 수도 있어.',
    bodyEn: 'Saylor sent a passionate letter about Bitcoin! Brace yourself, it might be long.',
  },
  {
    id: 'letter_dimon',
    type: 'letter_arrived',
    guruId: 'dimon',
    title: '📬 다이먼의 주주 서한 도착!',
    titleEn: '📬 Dimon\'s shareholder letter arrived!',
    body: '다이먼이 금융 시장 전망을 담은 편지를 보냈습니다. 기본에 충실한 내용일 거예요.',
    bodyEn: 'Dimon sent a letter with financial market outlook. It will be grounded in fundamentals.',
  },
  {
    id: 'letter_musk',
    type: 'letter_arrived',
    guruId: 'musk',
    title: '📬 머스크의 트윗 레터 🚀',
    titleEn: '📬 Musk\'s tweet-letter 🚀',
    body: '머스크가... 편지를 보냈어. 아마 트윗 스타일일 거야. 짧고 강렬하게.',
    bodyEn: 'Musk sent... a letter. Probably in tweet style. Short and intense.',
  },
  {
    id: 'letter_lynch',
    type: 'letter_arrived',
    guruId: 'lynch',
    title: '📬 린치 교수님의 편지!',
    titleEn: '📬 Professor Lynch\'s letter!',
    body: '린치가 마트에서 발견한 인사이트를 편지로 보내왔어. 실용적인 투자 팁이 담겨 있을 거야.',
    bodyEn: 'Lynch sent a letter with insights from the supermarket. Practical investment tips inside.',
  },
  {
    id: 'letter_marks',
    type: 'letter_arrived',
    guruId: 'marks',
    title: '📬 막스의 투자 메모 도착!',
    titleEn: '📬 Marks\'s investment memo arrived!',
    body: '막스가 신중하게 작성한 투자 메모를 보내왔어요. 2차 사고에 관한 내용일 것 같아요.',
    bodyEn: 'Marks carefully wrote an investment memo for you. Probably about second-level thinking.',
  },
  {
    id: 'letter_rogers',
    type: 'letter_arrived',
    guruId: 'rogers',
    title: '📬 로저스의 탐험 일지!',
    titleEn: '📬 Rogers\'s explorer\'s log!',
    body: '로저스가 세계 탐험에서 발견한 투자 기회를 편지로 전해왔어. 이머징 마켓 이야기야.',
    bodyEn: 'Rogers sent a letter about investment opportunities discovered on his world travels. It\'s about emerging markets.',
  },
];

// ---------------------------------------------------------------------------
// 6. market_alert — 시장 급변 알림 (5개, 매크로 담당 구루 중심)
// ---------------------------------------------------------------------------

const MARKET_ALERTS: NotificationTemplate[] = [
  {
    id: 'alert_druckenmiller',
    type: 'market_alert',
    guruId: 'druckenmiller',
    title: '⚡ 시장이 크게 움직이고 있어!',
    titleEn: '⚡ Market is moving big!',
    body: '시장이 크게 움직이고 있어. 매크로를 확인해봐. 이럴 때 맥락이 가장 중요해.',
    bodyEn: 'Market moving big. Check the macro. Context matters most at times like this.',
  },
  {
    id: 'alert_dalio',
    type: 'market_alert',
    guruId: 'dalio',
    title: '⚖️ 시장 균형이 흔들립니다',
    titleEn: '⚖️ Market balance is shaking',
    body: '시장 사이클이 전환점에 왔을 수 있어요. 맥락 카드로 지금 상황을 파악하세요.',
    bodyEn: 'The market cycle may be at a turning point. Check the context card to understand the situation.',
  },
  {
    id: 'alert_buffett',
    type: 'market_alert',
    guruId: 'buffett',
    title: '🔔 남들이 두려워할 때야',
    titleEn: '🔔 When others are fearful',
    body: '시장이 크게 흔들리고 있어. 남들이 두려워할 때 탐욕스러워지는 거야. 맥락을 봐.',
    bodyEn: 'Market shaking big. Be greedy when others are fearful. Check the context.',
  },
  {
    id: 'alert_rogers',
    type: 'market_alert',
    guruId: 'rogers',
    title: '🌍 글로벌 시장 급변!',
    titleEn: '🌍 Global market sudden shift!',
    body: '글로벌 시장에 급격한 변화가 감지됐어. 이머징 마켓부터 맥락 카드로 확인해봐.',
    bodyEn: 'Sudden change detected in global markets. Start with the context card from emerging markets.',
  },
  {
    id: 'alert_dimon',
    type: 'market_alert',
    guruId: 'dimon',
    title: '🚨 금융 리스크 경보',
    titleEn: '🚨 Financial risk alert',
    body: '시장에 큰 변동이 있습니다. 패닉하지 말고 맥락 카드로 상황을 파악하세요.',
    bodyEn: 'Major market volatility detected. Don\'t panic — check the context card to understand the situation.',
  },
];

// ---------------------------------------------------------------------------
// 7. prediction_result — 예측 결과 발표 알림 (5개)
// ---------------------------------------------------------------------------

const PREDICTION_RESULTS: NotificationTemplate[] = [
  {
    id: 'pred_buffett',
    type: 'prediction_result',
    guruId: 'buffett',
    title: '🎯 어제 예측 결과 나왔어!',
    titleEn: '🎯 Yesterday\'s prediction result is in!',
    body: '어제 예측 결과가 나왔어. 맞았든 틀렸든, 배움이 있다네. 복기해봐.',
    bodyEn: 'Yesterday\'s prediction results are in. Win or lose, there\'s learning. Review it.',
  },
  {
    id: 'pred_marks',
    type: 'prediction_result',
    guruId: 'marks',
    title: '📊 예측 복기 시간이에요',
    titleEn: '📊 Time to review your prediction',
    body: '예측 결과가 발표됐어요. 2차 사고로 돌아보는 시간. 맞았다면 운인지 실력인지도 따져보세요.',
    bodyEn: 'Prediction results are in. Time for second-level reflection. If right, ask if it was skill or luck.',
  },
  {
    id: 'pred_druckenmiller',
    type: 'prediction_result',
    guruId: 'druckenmiller',
    title: '⚡ 예측 결과 체크해!',
    titleEn: '⚡ Check your prediction result!',
    body: '결과가 나왔어. 틀렸다면 빠르게 배워. 맞았다면 왜 맞았는지 파악해.',
    bodyEn: 'Results are in. If wrong, learn fast. If right, understand why.',
  },
  {
    id: 'pred_lynch',
    type: 'prediction_result',
    guruId: 'lynch',
    title: '🎯 맞혔어? 확인해봐!',
    titleEn: '🎯 Did you get it right? Check!',
    body: '예측 결과가 나왔어! 크레딧도 받을 수 있어. 결과 확인하러 가자!',
    bodyEn: 'Prediction results are in! You might earn credits too. Let\'s check the results!',
  },
  {
    id: 'pred_dalio',
    type: 'prediction_result',
    guruId: 'dalio',
    title: '📈 예측 결과 성찰 시간',
    titleEn: '📈 Time to reflect on prediction results',
    body: '결과가 발표됐어요. 원칙적으로 말하면, 맞고 틀리는 것보다 배우는 것이 더 중요합니다.',
    bodyEn: 'Results are in. In principle, learning matters more than being right or wrong.',
  },
];

// ---------------------------------------------------------------------------
// 8. milestone — 마일스톤/업적 달성 알림 (5개)
// ---------------------------------------------------------------------------

const MILESTONES: NotificationTemplate[] = [
  {
    id: 'mile_buffett',
    type: 'milestone',
    guruId: 'buffett',
    title: '🏆 대단해, 친구!',
    titleEn: '🏆 Remarkable, friend!',
    body: '중요한 기록을 달성했어. 복리처럼 작은 성취가 쌓여 위대함이 되는 거야.',
    bodyEn: 'You\'ve achieved an important milestone. Like compounding, small achievements build greatness.',
  },
  {
    id: 'mile_dalio',
    type: 'milestone',
    guruId: 'dalio',
    title: '🌟 원칙이 빛을 발했습니다',
    titleEn: '🌟 Your principles shone',
    body: '꾸준함이 원칙을 만들어요. 오늘 달성한 것이 내일의 원칙이 됩니다. 축하해요!',
    bodyEn: 'Consistency creates principles. What you achieved today becomes tomorrow\'s principle. Congratulations!',
  },
  {
    id: 'mile_cathie_wood',
    type: 'milestone',
    guruId: 'cathie_wood',
    title: '🚀 혁신적인 달성!',
    titleEn: '🚀 Innovative achievement!',
    body: '와! 대단한 업적을 달성했어요! 이게 바로 지수적 성장이에요. 계속 가요!',
    bodyEn: 'Wow! You\'ve reached an amazing milestone! This is exponential growth. Keep going!',
  },
  {
    id: 'mile_saylor',
    type: 'milestone',
    guruId: 'saylor',
    title: '₿ LEGEND STATUS!',
    titleEn: '₿ LEGEND STATUS!',
    body: '전설이 됐어! 이 기록은 영원히 블록체인에 새겨지는 거야. HODL YOUR ACHIEVEMENTS!',
    bodyEn: 'You became a legend! This record is forever inscribed on the blockchain. HODL YOUR ACHIEVEMENTS!',
  },
  {
    id: 'mile_lynch',
    type: 'milestone',
    guruId: 'lynch',
    title: '🏅 텐배거 달성!',
    titleEn: '🏅 10-bagger achieved!',
    body: '이게 바로 마트에서 발견한 종목이 대박 나는 느낌이야! 정말 잘했어, 대단해!',
    bodyEn: 'This is what it feels like when a supermarket stock becomes a 10-bagger! Really well done!',
  },
];

// ---------------------------------------------------------------------------
// 전체 템플릿 통합
// ---------------------------------------------------------------------------

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  ...MORNING_REMINDERS,
  ...EVENING_SUMMARIES,
  ...STREAK_WARNINGS,
  ...EVENT_STARTS,
  ...LETTER_ARRIVED,
  ...MARKET_ALERTS,
  ...PREDICTION_RESULTS,
  ...MILESTONES,
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** 구루 ID 순환 순서 (날짜 기반 인덱싱용) */
const GURU_ROTATION = [
  'buffett',
  'dalio',
  'cathie_wood',
  'druckenmiller',
  'saylor',
  'dimon',
  'musk',
  'lynch',
  'marks',
  'rogers',
];

/**
 * 알림 유형에 해당하는 오늘의 템플릿 반환 (날짜 기반 구루 순환)
 * 매일 다른 구루의 목소리로 알림 제공
 */
export function getTemplateForType(
  type: NotificationTemplate['type'],
): NotificationTemplate {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const typeTemplates = NOTIFICATION_TEMPLATES.filter((t) => t.type === type);
  if (typeTemplates.length === 0) {
    // 폴백: 전체에서 첫 번째 반환
    return NOTIFICATION_TEMPLATES[0];
  }

  // 날짜 기반으로 순환
  const guruId = GURU_ROTATION[seed % GURU_ROTATION.length];
  const guruTemplate = typeTemplates.find((t) => t.guruId === guruId);

  // 해당 구루의 템플릿이 없으면 index 순환
  return guruTemplate ?? typeTemplates[seed % typeTemplates.length];
}

/**
 * 특정 구루 + 알림 유형으로 템플릿 단건 조회
 * 없으면 undefined 반환
 */
export function getTemplateByGuru(
  guruId: string,
  type: NotificationTemplate['type'],
): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES.find(
    (t) => t.guruId === guruId && t.type === type,
  );
}

/** 특정 알림 유형의 전체 템플릿 목록 반환 */
export function getTemplatesByType(
  type: NotificationTemplate['type'],
): NotificationTemplate[] {
  return NOTIFICATION_TEMPLATES.filter((t) => t.type === type);
}

/** 특정 구루의 모든 알림 템플릿 반환 */
export function getTemplatesByGuru(guruId: string): NotificationTemplate[] {
  return NOTIFICATION_TEMPLATES.filter((t) => t.guruId === guruId);
}

/** 템플릿 ID로 단건 조회 */
export function getTemplateById(id: string): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES.find((t) => t.id === id);
}
