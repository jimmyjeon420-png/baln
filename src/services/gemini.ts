import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// [CFO 전략 수정] 'flash' 모델 인식 오류 해결을 위해, 가장 안정적인 'pro' 모델로 교체
// gemini-1.5-pro는 이미지와 텍스트 분석에 가장 강력하고 안정적인 모델입니다.
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// 1. 포트폴리오 조언 (채팅용)
export const getPortfolioAdvice = async (prompt: any) => {
  try {
    const msg = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const result = await model.generateContent(msg);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "AI 연결 상태가 불안정합니다. 잠시 후 다시 시도해주세요.";
  }
};

// 2. 대화 요약 (저장용)
export const summarizeChat = async (messages: any[]) => {
  try {
    const conversation = messages.map(m => `${m.user.name}: ${m.text}`).join('\n');
    const result = await model.generateContent(`Summarize this logic into 3 bullet points (Korean):\n${conversation}`);
    return result.response.text();
  } catch (error) {
    return "요약 생성 실패";
  }
};

// 3. 이미지 자산 분석 (핵심 기능)
export const analyzeAssetImage = async (base64: string) => {
  try {
    console.log("Gemini: 이미지 분석 시작...");
    
    // JSON 형식을 더 강력하게 요구하는 프롬프트
    const prompt = `
      Analyze this investment portfolio image.
      Extract the asset list strictly in this JSON format:
      [
        {"ticker": "AAPL", "name": "Apple", "amount": 10, "price": 150.00},
        {"ticker": "TSLA", "name": "Tesla", "amount": 5, "price": 200.00}
      ]
      RULES:
      1. Return ONLY the Raw JSON string.
      2. No Markdown formatting (no \`\`\`).
      3. If uncertain, guess the ticker based on the name.
      4. Ensure valid JSON syntax.
    `;

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    console.log("Gemini Raw Response:", responseText);

    // 포장지(Markdown) 제거 및 공백 정리
    const cleanText = responseText
      .replace(/```json/g, '') // 시작 태그 제거
      .replace(/```/g, '')     // 끝 태그 제거
      .trim();                 // 앞뒤 공백 제거

    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return { error: "이미지를 분석할 수 없습니다. 다시 시도해주세요." };
  }
};