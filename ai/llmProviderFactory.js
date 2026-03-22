import { LMStudioProvider } from "./providers/LMStudioProvider.js";
import { OllamaProvider } from "./providers/OllamaProvider.js";

export function getLLMProvider(providerName = process.env.LLM_PROVIDER || "ollama") {
  const normalized = String(providerName).trim().toLowerCase();

  if (normalized === "lmstudio") {
    return new LMStudioProvider();
  }

  if (normalized === "ollama" || normalized === "") {
    return new OllamaProvider();
  }

  throw new Error(`Unsupported LLM provider: ${providerName}`);
}
