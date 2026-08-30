import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({
    apiKey,
  });
}

export function createGroqProvider(apiKey: string) {
  return createGroq({
    apiKey,
  });
}

export function createCerebrasProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "cerebras",
    apiKey,
    baseURL: "https://api.cerebras.ai/v1",
  });
}
