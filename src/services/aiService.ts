import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function judgePrediction(title: string, criteria: string) {
  const prompt = `You are an impartial AI judge for a prediction market.
The prediction question is: "${title}"
The judgment criteria is: "${criteria}"

Search the web for the latest information and determine if the prediction has come true based on the criteria.
You MUST output ONLY a valid JSON object with exactly two fields:
1. "result": exactly "yes" or "no"
2. "reason": a short explanation under 50 words citing the evidence you found

If impossible to determine, force a "yes" or "no" based on best available facts. Default to "no" if completely unknown.

Example output: {"result": "yes", "reason": "According to recent news, the event occurred on March 15, 2025."}`;

  const createParams: Anthropic.MessageCreateParamsNonStreaming = {
    model: "claude-opus-4-7",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  };

  let messages: Anthropic.MessageParam[] = createParams.messages as Anthropic.MessageParam[];
  let response = await client.messages.create(createParams);

  // Handle pause_turn: server-side search exceeded its iteration limit, continue the loop
  const MAX_CONTINUATIONS = 3;
  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < MAX_CONTINUATIONS) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({ ...createParams, messages });
    continuations++;
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const data = JSON.parse(text.trim());
    return {
      result: data.result === "yes" ? "yes" : "no" as "yes" | "no",
      reason: data.reason || "No reasoning provided.",
    };
  } catch {
    // Extract JSON if surrounded by other text
    const match = text.match(/\{[^{}]*"result"[^{}]*\}/);
    if (match) {
      try {
        const data = JSON.parse(match[0]);
        return {
          result: data.result === "yes" ? "yes" : "no" as "yes" | "no",
          reason: data.reason || "No reasoning provided.",
        };
      } catch { /* fall through */ }
    }
    console.error("AI output parsing failed:", text);
    return { result: "no" as const, reason: "Error evaluating criteria." };
  }
}
