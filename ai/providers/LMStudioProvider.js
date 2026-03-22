import axios from "axios";
import { normalizeLLMResponse } from "../llmResponseNormalizer.js";
import { LLMProvider } from "./LLMProvider.js";

let cachedLMStudioModel = null;

async function resolveLMStudioModel() {
  if (process.env.LM_STUDIO_MODEL) {
    return process.env.LM_STUDIO_MODEL;
  }

  if (cachedLMStudioModel) {
    return cachedLMStudioModel;
  }

  const response = await axios.get(process.env.LM_STUDIO_HOST + "/v1/models");
  const modelId =
    response.data?.data?.[0]?.id ||
    response.data?.models?.[0]?.id ||
    response.data?.models?.[0]?.model ||
    "local-model";

  cachedLMStudioModel = modelId;
  return modelId;
}

export class LMStudioProvider extends LLMProvider {
  async generate(payload = {}) {
    if (!process.env.LM_STUDIO_HOST) {
      throw new Error("LM_STUDIO_HOST is not configured");
    }

    const model = await resolveLMStudioModel();
    const messages = Array.isArray(payload.messages) && payload.messages.length > 0
      ? payload.messages
      : [
          { role: "system", content: "You only return valid JSON." },
          { role: "user", content: payload.prompt }
        ];

    const response = await axios.post(process.env.LM_STUDIO_HOST + "/v1/chat/completions", {
      model,
      messages,
      temperature: payload.temperature ?? 0,
      stream: false
    });
    const normalized = normalizeLLMResponse(response.data);

    return {
      provider: "lmstudio",
      moduleType: payload.moduleType,
      text: normalized.text,
      reasoning_content: normalized.reasoning_content,
      raw: response.data
    };
  }
}
