import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function judgePrediction(title: string, criteria: string) {
  const prompt = `You are an impartial AI judge for a prediction market.
The prediction question is: "${title}"
The judgment criteria is: "${criteria}"

Your task is to search the web for the latest information and determine if the prediction has come true or not based on the criteria.
You MUST output a JSON object with two fields:
1. "result": either "yes" or "no".
2. "reason": A short explanation (less than 50 words) of why you made this judgment, citing the evidence you found.

If it is impossible to determine (e.g., event hasn't happened yet), you must estimate the most likely outcome or return whatever current facts point to, but force a "yes" or "no" if at all possible based on criteria. If completely unknown, default to "no".`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview", // Use Pro for better reasoning
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          result: {
            type: Type.STRING,
            description: "Must be exactly 'yes' or 'no'",
          },
          reason: {
            type: Type.STRING,
            description: "Short reason for the decision, under 50 words.",
          },
        },
        required: ["result", "reason"],
      },
    },
  });

  const text = response.text || "{}";
  try {
    const data = JSON.parse(text);
    return {
      result: data.result === 'yes' ? 'yes' : 'no',
      reason: data.reason || "No reasoning provided.",
    };
  } catch (e) {
    console.error("AI output parsing failed", e);
    return {
      result: 'no',
      reason: "Error evaluating criteria.",
    };
  }
}
