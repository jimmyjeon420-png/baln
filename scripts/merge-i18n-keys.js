#!/usr/bin/env node
/**
 * Merge new i18n keys into en.json and ko.json
 * Run: node scripts/merge-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const EN_PATH = path.join(__dirname, '../src/locales/en.json');
const KO_PATH = path.join(__dirname, '../src/locales/ko.json');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ========== NEW ENGLISH KEYS ==========
const newEN = {
  home: {
    review_description: {
      success_reason: "Why you succeeded",
      fail_reason: "Why you were wrong",
      learning_point: "Learning Point"
    },
    review_source: {
      observed: "Observed",
      condition: "Condition",
      reasoning: "Reasoning",
      source: "Source"
    },
    extract_tag: {
      yes_scenario: "YES Scenario",
      no_scenario: "NO Scenario",
      learning_point_tag: "LearningPoint",
      observed_data: "ObservedData",
      condition_verify: "ConditionVerify",
      key_reasoning: "KeyReasoning"
    },
    data_source: {
      baln_engine: "baln Analysis Engine"
    },
    quote_author: {
      buffett: "Warren Buffett 🦉",
      dalio: "Ray Dalio 🦌",
      cathie_wood: "Cathie Wood 🦊",
      druckenmiller: "Druckenmiller 🐆",
      saylor: "Michael Saylor 🐺",
      dimon: "Jamie Dimon 🦁",
      musk: "Elon Musk 🦎",
      lynch: "Peter Lynch 🐻",
      marks: "Howard Marks 🐢",
      rogers: "Jim Rogers 🐯"
    }
  },
  profile: {
    user_default_name: "User",
    login_prompt: "Log in to sync your data",
    error: {
      logout_failed: "An error occurred while logging out."
    },
    admin: {
      title: "Admin Dashboard",
      subtitle: "Manage users, metrics, and lounge"
    },
    village_section_title: "🏘️ Village Status",
    village_prosperity_label: "Prosperity",
    village_top_gurus_label: "Top Gurus",
    village_no_gurus_hint: "Chat with gurus in the village",
    menu: {
      bookmarks: "My Bookmarks"
    }
  },
  rebalance: {
    date: {
      weekday_short: {
        sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat"
      },
      format: "{{weekday}}, {{month}}/{{day}}"
    },
    dr_marks: {
      name: "🐢 Dr. Marks",
      quote: "\"The most important thing is understanding risk\""
    }
  },
  roundtable: {
    suggested_topics: {
      topic_1: "The market dropped today — is it a buying opportunity?",
      topic_2: "How does an interest rate cut impact the stock market?",
      topic_3: "Bitcoin vs. Gold — where should I invest?",
      topic_4: "AI-related stocks — is it still not too late?"
    },
    min_participants_alert: "At least 3 participants are required.",
    max_participants_alert: "You can have at most 5 participants.",
    alert_title: "Notice",
    section_suggested_topics: "Today's Suggested Topics",
    section_custom_topic: "Or type your own",
    free_badge: "Free",
    section_recent: "Recent Discussions",
    history_turns: "{{count}} turns",
    history_participants: "{{count}} gurus",
    sentiment: {
      bullish: "Bullish",
      bearish: "Bearish",
      neutral: "Neutral",
      cautious: "Cautious"
    }
  },
  village: {
    loading: "Loading village...",
    friendship: {
      tier: {
        stranger: "Stranger",
        acquaintance: "Acquaintance",
        friend: "Friend",
        close_friend: "Close Friend",
        best_friend: "Best Friend",
        mentor: "Mentor",
        soulmate: "Soulmate"
      },
      score_to_next: "{{score}} pts · {{points}} to next",
      score_max: "{{score}} pts (Max!)",
      soulmate_banner: "Legendary Bond ✨"
    },
    prosperity: {
      level_1: "First Spark",
      level_2: "Tiny Sprout",
      level_3: "Dawn Village",
      level_4: "Growing Ground",
      level_5: "Lively Square",
      level_6: "Crossroads of Prosperity",
      level_7: "Golden Fields",
      level_8: "City of Sages",
      level_9: "Hall of Legends",
      level_10: "Eternal Village",
      default_name: "Baln Village",
      level_sub: "Village Lv.{{level}}",
      level_sub_max: "Village Lv.{{level}} · Legendary!",
      today_label: "today",
      max_label: "MAX",
      max_banner: "✨ Legendary Village! Become soulmates with all gurus ✨"
    },
    brand: {
      category: {
        tech: "Tech",
        fashion: "Fashion",
        food: "Food",
        finance: "Finance",
        auto: "Auto",
        entertainment: "Entertainment"
      }
    },
    letter: {
      tier_badge: {
        stranger: "Resident",
        acquaintance: "Neighbor",
        friend: "Friend",
        close_friend: "Close",
        best_friend: "Student",
        mentor: "Mentor",
        soulmate: "Legend"
      },
      time_just_now: "Just now",
      time_minutes_ago: "{{minutes}}m ago",
      time_hours_ago: "{{hours}}h ago",
      time_days_ago: "{{days}}d ago",
      inbox_title: "Mailbox",
      unread_count: "{{count}} unread letter(s)",
      empty_title: "No letters yet",
      empty_desc: "Build friendship with gurus to receive letters",
      from_label: "From",
      attached_gift_label: "Attached Gift",
      close_button: "Close Letter"
    }
  },
  investor_level: {
    header_title: "My Investment Level",
    next_level_hint: "{{xpToNext}} XP to next level",
    streak_active: "{{streak}}-day streak!",
    streak_empty: "Start your streak",
    heatmap_title: "Last 30 days",
    stat_total_xp: "Total XP",
    stat_total_checkins: "Total Check-ins",
    stat_longest_streak: "Longest Streak",
    stat_quiz_accuracy: "Quiz Accuracy",
    xp_history_title: "XP History",
    days_unit: "days"
  },
  settings: {
    notifications: {
      push_title: "🔔 Push Notifications",
      push_desc: "Turn all notifications on or off at once",
      push_off_warning: "Notifications are off. You may miss important market changes.",
      section_types: "Notification Types",
      section_intensity: "Notification Intensity",
      rebalance_label: "Rebalancing Alert",
      rebalance_summary: "We'll notify you when your portfolio needs review",
      rebalance_detail_1: "Weekly rebalancing reminder every Monday at 9 AM",
      rebalance_detail_2: "Portfolio check alert if app is not opened for 3+ days",
      rebalance_detail_3: "Rebalancing means adjusting your assets back to your target allocation",
      price_label: "Price Change Alert",
      price_summary: "Don't miss large price movements in your holdings",
      price_detail_1: "Daily price change check notification at 7:30 AM",
      price_detail_2: "Highlights assets that moved beyond your threshold (±3/5/7%) when you open the app",
      price_detail_3: "You can adjust the threshold in the 'Price Change Threshold' section below",
      price_detail_4: "e.g. With ±5% threshold, an asset that dropped -6.2% yesterday triggers a check alert",
      market_summary: "Receive daily AI-analyzed market trends every morning",
      market_detail_1: "Daily AI briefing notification at 8 AM",
      market_detail_2: "AI analyzes the previous day's market data and summarizes key insights",
      market_detail_3: "Includes interest rate/FX/major index changes + portfolio prescription",
      price_threshold_title: "Price Change Threshold",
      price_threshold_desc: "Set the minimum price movement percentage for the price change alert.",
      weekly_cap_title: "Weekly Notification Limit",
      weekly_cap_desc: "Limit the number of notifications per week to reduce notification fatigue.",
      weekly_cap_unit: "{{n}}/week",
      info_permission: "Notifications require permission to be enabled. Check that baln notifications are turned on in your device settings.",
      info_timing: "Notification times are based on your device's local time. Price alert 7:30 → Morning briefing 8:00 → Rebalancing check 9:00 (Monday).",
      info_current_settings: "Current settings: Price threshold ±{{threshold}}% · Weekly limit {{cap}} times"
    },
    referral: {
      login_required: "Please log in to invite friends.",
      banner_title: "Invite friends and earn {{amount}}C (₩{{krw}})!",
      banner_subtitle: "Your friend also receives 10C (₩1,000) when they sign up",
      code_generating: "Generating code...",
      copy_done: "Copied",
      copy: "Copy Code",
      share_button: "Share with Friends",
      reward_section_title: "Reward Guide",
      my_reward_title: "My Reward",
      my_reward_desc: "Paid after friend logs in for 3 consecutive days",
      friend_reward_title: "Friend's Reward",
      friend_reward_desc: "Paid as a welcome bonus upon sign-up",
      how_to_title: "How It Works",
      step_1: "Share your invite code using the button above",
      step_2: "Your friend signs up for the baln app",
      step_3: "Friend enters the code in Profile > Enter Referral Code",
      step_4: "Friend gets 10C instantly + you get 20C after 3 days",
      share_message: "Build a 5-minute daily investment habit with baln!\nMy invite code: {{code}}\nhttps://baln.app"
    },
    delete_account: {
      lose_title: "Deleting your account will\npermanently remove the following data",
      lose_credit: "Credit Balance",
      lose_portfolio: "Portfolio",
      lose_streak: "Streak Record",
      lose_prediction: "Prediction History",
      lose_community: "Community Posts & Comments",
      lose_value_streak: "{{days}}-day streak",
      lose_value_prediction: "{{count}} votes",
      lose_value_community: "{{posts}} posts, {{comments}} comments",
      loading: "Loading...",
      export_button: "Export Data Before Deletion (JSON)",
      export_hint: "You can download your data before deletion in accordance with privacy laws",
      proceed_button: "Continue",
      keep_account: "No, keep my account",
      verify_title: "Identity Verification",
      verify_desc: "To proceed with account deletion,\nplease re-enter your registered email address.",
      current_account_label: "Current Account",
      email_unknown: "Unknown",
      email_mismatch: "Email does not match",
      email_match: "Email verified",
      next_button: "Next",
      back_button: "Go Back",
      final_title: "Final Confirmation",
      final_desc: "Pressing the button below will permanently delete\nyour account and all data.\nThis action cannot be undone.",
      summary_title: "Items to Delete",
      summary_portfolio: "Portfolio, AI analysis results",
      summary_credits: "Credits, prediction history, streak",
      summary_community: "Community posts, comments, likes",
      summary_settings: "Notification settings, all in-app data",
      delete_button: "Permanently Delete Account",
      keep_button: "I'll Keep My Account",
      confirm_delete_button: "Delete",
      success_title: "Account Deleted",
      success_desc: "Thank you for using baln.",
      fail_title: "Deletion Failed",
      fail_desc: "An error occurred while deleting your account. Please try again later.",
      error_title: "Error Occurred",
      error_desc: "An unexpected error occurred while deleting your account.",
      export_fail_title: "Export Failed",
      export_fail_desc: "An error occurred while exporting your data. Please try again later.",
      share_title: "baln Account Data"
    },
    help: {
      faq_q1: "What is baln?",
      faq_a1: "baln is an investment education app where you build your own investment principles by reading daily 5-minute market context, participating in predictions, and reviewing outcomes. It is not a trading app.",
      faq_q2: "What is the Context Card?",
      faq_a2: "The Context Card helps you understand why your assets moved today through 4-layer analysis (historical context, macro chain, institutional behavior, portfolio impact) in 5 minutes. It auto-updates every 3 hours.",
      faq_q3: "How do I participate in the prediction game?",
      faq_a3: "Vote YES/NO on 3 daily market prediction questions. Review results and explanations the next day. Earn 3 credits for correct predictions.",
      faq_q4: "How do I use credits?",
      faq_a4: "1 credit = ₩100. Earn for free via check-in (2C), correct prediction (3C), sharing (5C). Spend in the marketplace for extra AI analysis (1C), Premium trial (5C), etc.",
      faq_q5: "How does the AI health checkup work?",
      faq_a5: "AI analyzes 7 factors including diversification, volatility, and concentration, rating your portfolio from A+ to F. It also provides a prescription with specific improvement steps.",
      faq_q6: "What are Guru Insights?",
      faq_a6: "AI analyzes the philosophy of world-class investors like Warren Buffett, Ray Dalio, Cathie Wood, and Stanley Druckenmiller, and provides daily insights applied to today's market.",
      faq_q7: "Is my data secure?",
      faq_a7: "We operate on a Zero-Knowledge principle. We do not collect brokerage passwords or account numbers. All data is encrypted with TLS 1.3 + AES-256.",
      faq_q8: "What are the benefits of a Premium subscription?",
      faq_a8: "Full 4-layer context card analysis, prediction explanations + review, 3 AI diagnoses/day, institutional behavior analysis, full peer comparison, and 30C monthly bonus. ₩4,900/month.",
      email_label: "Email Support",
      feedback_label: "In-App Feedback",
      feedback_desc: "You can submit feedback via Settings > Help"
    },
    about: {
      framework_label: "Framework",
      ai_engine_label: "AI Engine",
      section_version: "Version Info",
      section_legal: "Help & Legal",
      tagline: "The Beginning of Sound Investing",
      official_website: "Official Website",
      copyright: "© 2026 Baln Co., Ltd. All rights reserved."
    }
  },
  guru: {
    style: {
      card_dalio: {
        name: "Ray Dalio",
        tagline: "\"Survive in any economic environment\"",
        description: "Bridgewater founder. A portfolio designed to survive recession, inflation, and deflation. Safety net built with bonds and gold."
      },
      card_buffett: {
        name: "Warren Buffett",
        tagline: "\"Only assets that produce are real investments\"",
        description: "The Oracle of Omaha. Buy great companies and hold forever. Keep 25% cash to buy during market panic."
      },
      card_cathie: {
        name: "Cathie Wood",
        tagline: "\"Innovation changes the future\"",
        description: "ARK Invest CEO. Focus on AI, crypto, biotech, and robotics innovation. BTC $1.5M target. High-risk, high-reward strategy."
      },
      alloc_labels: {
        stock: "Stocks",
        bond: "Bonds",
        gold: "Gold",
        commodity: "Commodities",
        cash: "Cash",
        innovation: "Innovation",
        altcoin: "Altcoins"
      }
    },
    detail: {
      sentiment_position: "{{sentiment}} Position"
    }
  }
};

// ========== NEW KOREAN KEYS ==========
const newKO = {
  home: {
    review_description: {
      success_reason: "성공 이유",
      fail_reason: "실패 이유",
      learning_point: "학습 포인트"
    },
    review_source: {
      observed: "관측값",
      condition: "조건",
      reasoning: "판정 근거",
      source: "출처"
    },
    extract_tag: {
      yes_scenario: "YES 시나리오",
      no_scenario: "NO 시나리오",
      learning_point_tag: "학습포인트",
      observed_data: "관측데이터",
      condition_verify: "조건검증",
      key_reasoning: "핵심근거"
    },
    data_source: {
      baln_engine: "baln 분석 엔진"
    },
    quote_author: {
      buffett: "워렌 버핏 🦉",
      dalio: "레이 달리오 🦌",
      cathie_wood: "캐시 우드 🦊",
      druckenmiller: "드러킨밀러 🐆",
      saylor: "마이클 세일러 🐺",
      dimon: "제이미 다이먼 🦁",
      musk: "일론 머스크 🦎",
      lynch: "피터 린치 🐻",
      marks: "하워드 막스 🐢",
      rogers: "짐 로저스 🐯"
    }
  },
  profile: {
    user_default_name: "사용자",
    login_prompt: "로그인하여 데이터를 동기화하세요",
    error: {
      logout_failed: "로그아웃 중 오류가 발생했습니다."
    },
    admin: {
      title: "관리자 대시보드",
      subtitle: "유저, 지표, 라운지 관리"
    },
    village_section_title: "🏘️ 마을 현황",
    village_prosperity_label: "번영도",
    village_top_gurus_label: "친한 구루",
    village_no_gurus_hint: "마을에서 구루와 대화해보세요",
    menu: {
      bookmarks: "내 북마크"
    }
  },
  rebalance: {
    date: {
      weekday_short: {
        sun: "일", mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토"
      },
      format: "{{month}}월 {{day}}일 {{weekday}}요일"
    },
    dr_marks: {
      name: "🐢 Dr. 막스",
      quote: "\"가장 중요한 것은 위험을 아는 것입니다\""
    }
  },
  roundtable: {
    suggested_topics: {
      topic_1: "오늘 시장이 하락했는데, 매수 기회일까?",
      topic_2: "금리 인하가 주식시장에 미치는 영향은?",
      topic_3: "비트코인 vs 금, 어디에 투자해야 할까?",
      topic_4: "AI 관련주, 아직 늦지 않았을까?"
    },
    min_participants_alert: "최소 3명의 참석자가 필요합니다.",
    max_participants_alert: "최대 5명까지 참석할 수 있습니다.",
    alert_title: "알림",
    section_suggested_topics: "오늘의 추천 주제",
    section_custom_topic: "또는 직접 입력",
    free_badge: "무료",
    section_recent: "최근 토론",
    history_turns: "{{count}}턴",
    history_participants: "{{count}}명",
    sentiment: {
      bullish: "낙관",
      bearish: "비관",
      neutral: "중립",
      cautious: "신중"
    }
  },
  village: {
    loading: "마을 준비 중...",
    friendship: {
      tier: {
        stranger: "낯선 사이",
        acquaintance: "아는 사이",
        friend: "친구",
        close_friend: "절친",
        best_friend: "베프",
        mentor: "스승",
        soulmate: "소울메이트"
      },
      score_to_next: "{{score}}점 · 다음 티어까지 {{points}}점",
      score_max: "{{score}}점 (만렙!)",
      soulmate_banner: "전설의 동반자 ✨"
    },
    prosperity: {
      level_1: "첫 번째 불꽃",
      level_2: "작은 싹",
      level_3: "새벽의 마을",
      level_4: "성장하는 터전",
      level_5: "활기찬 광장",
      level_6: "번영의 길목",
      level_7: "황금빛 들녘",
      level_8: "현자의 도시",
      level_9: "전설의 전당",
      level_10: "영원한 마을",
      default_name: "발른 마을",
      level_sub: "마을 레벨 {{level}}",
      level_sub_max: "마을 레벨 {{level}} · 전설 달성!",
      today_label: "오늘",
      max_label: "만렙",
      max_banner: "✨ 전설의 마을 달성! 모든 구루와 소울메이트가 되세요 ✨"
    },
    brand: {
      category: {
        tech: "기술",
        fashion: "패션",
        food: "식음",
        finance: "금융",
        auto: "자동차",
        entertainment: "엔터"
      }
    },
    letter: {
      tier_badge: {
        stranger: "주민님",
        acquaintance: "이웃님",
        friend: "친구",
        close_friend: "가까운 벗",
        best_friend: "제자",
        mentor: "스승",
        soulmate: "전설"
      },
      time_just_now: "방금 전",
      time_minutes_ago: "{{minutes}}분 전",
      time_hours_ago: "{{hours}}시간 전",
      time_days_ago: "{{days}}일 전",
      inbox_title: "우체통",
      unread_count: "읽지 않은 편지 {{count}}통",
      empty_title: "아직 편지가 없어요",
      empty_desc: "구루와 친해지면 편지를 받을 수 있어요",
      from_label: "보낸이",
      attached_gift_label: "첨부 선물",
      close_button: "편지 닫기"
    }
  },
  investor_level: {
    header_title: "내 투자 레벨",
    next_level_hint: "다음 레벨까지 {{xpToNext}} XP",
    streak_active: "{{streak}}일 연속 출석!",
    streak_empty: "출석을 시작하세요",
    heatmap_title: "최근 30일",
    stat_total_xp: "총 XP",
    stat_total_checkins: "총 출석",
    stat_longest_streak: "최장 연속",
    stat_quiz_accuracy: "퀴즈 정답률",
    xp_history_title: "XP 히스토리",
    days_unit: "일"
  },
  settings: {
    notifications: {
      push_title: "🔔 푸시 알림",
      push_desc: "모든 알림을 한 번에 켜거나 끌 수 있어요",
      push_off_warning: "알림이 꺼져 있습니다. 중요한 시장 변화를 놓칠 수 있어요.",
      section_types: "알림 종류",
      section_intensity: "알림 강도",
      rebalance_label: "리밸런싱 알림",
      rebalance_summary: "포트폴리오 점검이 필요할 때 알려드려요",
      rebalance_detail_1: "매주 월요일 오전 9시에 주간 리밸런싱 점검 리마인더",
      rebalance_detail_2: "3일 이상 앱을 열지 않으면 포트폴리오 확인 알림",
      rebalance_detail_3: "리밸런싱이란? 자산 비율이 원래 목표에서 벗어났을 때 다시 맞추는 것이에요",
      price_label: "가격 변동 알림",
      price_summary: "보유 종목의 큰 가격 변동을 놓치지 마세요",
      price_detail_1: "매일 아침 7:30에 전일 가격 변동 확인 알림",
      price_detail_2: "앱을 열면 설정한 기준(±3/5/7%) 이상 변동한 종목을 하이라이트",
      price_detail_3: "기준은 아래 \"가격 변동 기준\"에서 조정할 수 있어요",
      price_detail_4: "예) 기준이 ±5%일 때, 어제 -6.2% 하락 종목은 확인 알림",
      market_summary: "AI가 분석한 오늘의 시장 동향을 매일 받아보세요",
      market_detail_1: "매일 아침 8시에 AI 브리핑 알림",
      market_detail_2: "AI가 전날 시장 데이터를 분석하여 핵심 정보를 정리",
      market_detail_3: "금리/환율/주요 지수 변동 + 포트폴리오 처방전 포함",
      price_threshold_title: "가격 변동 기준",
      price_threshold_desc: "가격 변동 알림에서 몇 % 이상 움직였을 때 확인할지 설정합니다.",
      weekly_cap_title: "주간 알림 상한",
      weekly_cap_desc: "한 주에 받는 알림 개수를 제한해 알림 피로도를 줄입니다.",
      weekly_cap_unit: "주 {{n}}회",
      info_permission: "알림은 휴대폰의 알림 권한이 허용되어 있어야 동작합니다. 기기 설정에서 baln의 알림이 켜져 있는지 확인해주세요.",
      info_timing: "알림 발송 시간은 기기의 현지 시간 기준입니다. 가격 변동 알림 7:30 → 아침 브리핑 8:00 → 리밸런싱 점검 9:00(월요일) 순서로 도착합니다.",
      info_current_settings: "현재 설정: 가격 변동 기준 ±{{threshold}}% · 주간 알림 상한 {{cap}}회"
    },
    referral: {
      login_required: "로그인 후 친구를 초대할 수 있습니다.",
      banner_title: "친구를 초대하고 {{amount}}C ({{krw}}원)을 받으세요!",
      banner_subtitle: "친구도 가입 시 10C (1,000원)를 받습니다",
      code_generating: "코드 생성 중...",
      copy_done: "복사됨",
      copy: "코드 복사",
      share_button: "친구에게 공유하기",
      reward_section_title: "보상 안내",
      my_reward_title: "내가 받는 보상",
      my_reward_desc: "친구가 3일 연속 접속 후 지급",
      friend_reward_title: "친구가 받는 보상",
      friend_reward_desc: "가입 시 웰컴 보너스로 지급",
      how_to_title: "이용 방법",
      step_1: "위의 공유 버튼으로 초대 코드를 전달하세요",
      step_2: "친구가 baln 앱에 가입합니다",
      step_3: "친구가 프로필 > 추천 코드 입력에서 코드를 입력합니다",
      step_4: "친구에게 10C 즉시 + 나에게 20C는 3일 접속 후 지급",
      share_message: "baln에서 매일 5분 투자 습관을 만들어보세요!\n내 초대 코드: {{code}}\nhttps://baln.app"
    },
    delete_account: {
      lose_title: "계정을 삭제하면\n다음 데이터가 영구 삭제됩니다",
      lose_credit: "보유 크레딧",
      lose_portfolio: "포트폴리오",
      lose_streak: "연속 기록",
      lose_prediction: "예측 기록",
      lose_community: "커뮤니티 글/댓글",
      lose_value_streak: "{{days}}일 스트릭",
      lose_value_prediction: "{{count}}회 투표",
      lose_value_community: "글 {{posts}}개, 댓글 {{comments}}개",
      loading: "로딩 중...",
      export_button: "삭제 전 데이터 내보내기 (JSON)",
      export_hint: "개인정보보호법에 따라 삭제 전 데이터를 다운로드할 수 있습니다",
      proceed_button: "계속 진행",
      keep_account: "아니요, 계정을 유지할게요",
      verify_title: "본인 확인",
      verify_desc: "계정 삭제를 진행하려면\n가입하신 이메일 주소를 다시 입력해주세요.",
      current_account_label: "현재 계정",
      email_unknown: "알 수 없음",
      email_mismatch: "이메일이 일치하지 않습니다",
      email_match: "이메일이 확인되었습니다",
      next_button: "다음",
      back_button: "이전으로",
      final_title: "최종 확인",
      final_desc: "아래 버튼을 누르면 계정과 모든 데이터가\n영구적으로 삭제되며,\n이 작업은 되돌릴 수 없습니다.",
      summary_title: "삭제 대상",
      summary_portfolio: "포트폴리오, AI 분석 결과",
      summary_credits: "크레딧, 예측 기록, 스트릭",
      summary_community: "커뮤니티 글, 댓글, 좋아요",
      summary_settings: "알림 설정, 앱 내 모든 데이터",
      delete_button: "계정 영구 삭제",
      keep_button: "계정을 유지하겠습니다",
      confirm_delete_button: "삭제합니다",
      success_title: "계정이 삭제되었습니다",
      success_desc: "그동안 baln을 이용해 주셔서 감사합니다.",
      fail_title: "삭제 실패",
      fail_desc: "계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      error_title: "오류 발생",
      error_desc: "계정 삭제 중 예기치 않은 오류가 발생했습니다.",
      export_fail_title: "내보내기 실패",
      export_fail_desc: "데이터를 내보내는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      share_title: "baln 계정 데이터"
    },
    help: {
      faq_q1: "baln은 어떤 앱인가요?",
      faq_a1: "매일 5분씩 시장 맥락을 읽고, 예측에 참여하고, 복기하면서 자기만의 투자 기준을 만드는 투자 교육 앱입니다. 직접 매매를 하는 앱이 아닙니다.",
      faq_q2: "맥락 카드란 무엇인가요?",
      faq_a2: "오늘 내 자산이 왜 이렇게 움직였는지 4겹 분석(역사적 맥락, 거시경제 체인, 기관 행동, 내 포트폴리오 영향)으로 5분 안에 이해할 수 있는 카드입니다. 3시간마다 자동 업데이트됩니다.",
      faq_q3: "예측 게임은 어떻게 참여하나요?",
      faq_a3: "매일 3개의 시장 예측 질문에 YES/NO로 투표합니다. 다음날 결과를 확인하고 해설을 통해 복기합니다. 적중 시 3크레딧을 획득합니다.",
      faq_q4: "크레딧은 어떻게 사용하나요?",
      faq_a4: "1크레딧 = 100원 가치입니다. 출석(2C), 예측 적중(3C), 공유(5C)로 무료 획득 가능하며, AI 분석 추가(1C), Premium 체험(5C) 등 마켓플레이스에서 사용합니다.",
      faq_q5: "AI 건강 진단은 어떻게 작동하나요?",
      faq_a5: "포트폴리오의 분산도, 변동성, 집중도 등 7가지 요소를 AI가 분석하여 A+~F 등급으로 진단합니다. 처방전과 함께 구체적인 개선 방향도 제시합니다.",
      faq_q6: "투자 거장 인사이트는 뭔가요?",
      faq_a6: "워렌 버핏, 레이 달리오, 캐시 우드, 스탠리 드러킨밀러 등 세계적 투자자의 철학을 AI가 분석하여 오늘 시장에 적용한 인사이트를 매일 제공합니다.",
      faq_q7: "내 데이터는 안전한가요?",
      faq_a7: "제로 지식(Zero-Knowledge) 원칙으로 운영합니다. 증권사 비밀번호, 계좌번호를 수집하지 않으며, 모든 데이터는 TLS 1.3 + AES-256으로 암호화됩니다.",
      faq_q8: "Premium 구독은 어떤 혜택이 있나요?",
      faq_a8: "맥락 카드 전체 4겹 분석, 예측 해설 + 복기, AI 진단 3회/일, 기관 행동 분석, 또래 비교 전체 등급, 매월 30C 보너스를 제공합니다. 월 ₩4,900입니다.",
      email_label: "이메일 문의",
      feedback_label: "앱 내 피드백",
      feedback_desc: "설정 > 도움말에서 문의할 수 있습니다"
    },
    about: {
      framework_label: "프레임워크",
      ai_engine_label: "AI 엔진",
      section_version: "버전 정보",
      section_legal: "도움말 & 법적 고지",
      tagline: "올바른 투자의 시작",
      official_website: "공식 웹사이트",
      copyright: "© 2026 발른 주식회사. All rights reserved."
    }
  },
  guru: {
    style: {
      card_dalio: {
        name: "레이 달리오",
        tagline: "\"어떤 경제 환경에서도 생존\"",
        description: "브릿지워터 창업자. 경기침체·인플레·디플레 모든 환경에서 살아남는 포트폴리오. 채권과 금으로 안전판 구축."
      },
      card_buffett: {
        name: "워렌 버핏",
        tagline: "\"생산하는 자산만 진짜 투자\"",
        description: "오마하의 현인. 위대한 기업을 사서 영원히 보유. 현금 25%로 공포 극성 시 저가 매수 기회 포착."
      },
      card_cathie: {
        name: "캐시 우드",
        tagline: "\"혁신이 미래를 바꾼다\"",
        description: "ARK Invest CEO. AI·크립토·바이오·로봇 혁신 기술에 집중. BTC $1.5M 목표. 고위험·고수익 전략."
      },
      alloc_labels: {
        stock: "주식",
        bond: "채권",
        gold: "금",
        commodity: "원자재",
        cash: "현금",
        innovation: "혁신주",
        altcoin: "알트코인"
      }
    },
    detail: {
      sentiment_position: "{{sentiment}} 포지션"
    }
  }
};

// Read, merge, write
const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const ko = JSON.parse(fs.readFileSync(KO_PATH, 'utf8'));

deepMerge(en, newEN);
deepMerge(ko, newKO);

fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(KO_PATH, JSON.stringify(ko, null, 2) + '\n', 'utf8');

// Count new keys
function countKeys(obj) {
  let count = 0;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      count += countKeys(obj[k]);
    } else {
      count++;
    }
  }
  return count;
}

console.log(`✅ Merged ${countKeys(newEN)} EN keys and ${countKeys(newKO)} KO keys`);
console.log(`📁 en.json: ${Object.keys(en).length} top-level sections`);
console.log(`📁 ko.json: ${Object.keys(ko).length} top-level sections`);
