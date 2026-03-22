import axios from "axios";
import { normalizeLLMResponse } from "../llmResponseNormalizer.js";
import { LLMProvider } from "./LLMProvider.js";

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

export class OllamaProvider extends LLMProvider {
  async generate(payload = {}) {
    if (!process.env.OLLAMA_HOST) {
      throw new Error("OLLAMA_HOST is not configured");
    }

    if (Array.isArray(payload.messages) && payload.messages.length > 0) {
      const response = await axios.post(process.env.OLLAMA_HOST + "/api/chat", {
        model: DEFAULT_OLLAMA_MODEL,
        messages: payload.messages,
        temperature: payload.temperature ?? 0,
        stream: false
      });
      const normalized = normalizeLLMResponse(response.data);

      return {
        provider: "ollama",
        moduleType: payload.moduleType,
        text: normalized.text,
        reasoning_content: normalized.reasoning_content,
        raw: response.data
      };
    }

    const response = await axios.post(process.env.OLLAMA_HOST + "/api/generate", {
      model: DEFAULT_OLLAMA_MODEL,
      prompt: payload.prompt,
      temperature: payload.temperature ?? 0,
      stream: false
    });
    const normalized = normalizeLLMResponse(response.data);

    return {
      provider: "ollama",
      moduleType: payload.moduleType,
      text: normalized.text,
      reasoning_content: normalized.reasoning_content,
      raw: response.data
    };
  }
}
