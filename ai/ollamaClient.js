import { getLLMProvider } from "./llmProviderFactory.js";
import { promptJobMarketAnalysis } from "../prompt/jobMarketAnalysis.js";
import { promptResumeAnalysis } from "../prompt/resumeAnalysis.js";

const DEFAULT_MODULE_TYPE = process.env.LLM_MODULE_TYPE || "job_analysis";

function resolveModuleType(explicitType) {
  return explicitType || DEFAULT_MODULE_TYPE;
}

function tryParseOrSanitize(candidate) {
  try {
    return JSON.parse(candidate);
  } catch {
    let sanitized = candidate;

    sanitized = sanitized.replace(/,\s*(?=[}\]])/g, "");
    sanitized = sanitized.replace(/([:\[{,\s])'([^']*?)'(?=[,\]}\s])/g, '$1"$2"');
    sanitized = sanitized.replace(/\[([\s\S]*?)\]/g, (match, inner) => {
      if (/"|:|,/.test(inner)) {
        return match.replace(/,\s*(?=[\]\}])/g, "");
      }

      const items = inner
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);

      return items.length ? JSON.stringify(items) : match;
    });
    sanitized = sanitized.replace(/"?missing_skills"?\s*:\s*\n((?:\s*[-*].+\n?)+)/im, (match, bullets) => {
      const items = bullets
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
        .filter(Boolean);
      return '"missing_skills": ' + JSON.stringify(items);
    });
    sanitized = sanitized.replace(/(\[)\s*([^"\]\[][^\"]*?)\s*(\])/g, (match, open, inner) => {
      const parts = inner
        .split(/\s*,\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          if (/^".*"$/.test(part) || /^'.*'$/.test(part)) {
            return part;
          }
          return JSON.stringify(part.replace(/^[-*]\s*/, ""));
        });

      return open + parts.join(",") + "]";
    });

    try {
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

function parseStructuredJson(responseText) {
  const cleaned = responseText.replace(/```json|```/g, "").trim();

  let value = tryParseOrSanitize(cleaned);
  if (!value) {
    for (let i = 0; i < cleaned.length; i += 1) {
      if (cleaned[i] !== "{" && cleaned[i] !== "[") {
        continue;
      }

      const startChar = cleaned[i];
      const endChar = startChar === "{" ? "}" : "]";
      let depth = 0;

      for (let j = i; j < cleaned.length; j += 1) {
        const char = cleaned[j];
        if (char === startChar) depth += 1;
        if (char === endChar) depth -= 1;

        if (depth === 0) {
          const candidate = cleaned.slice(i, j + 1);
          const parsed = tryParseOrSanitize(candidate);
          if (parsed) {
            return parsed;
          }
          break;
        }
      }
    }
  }

  if (!value) {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      value = tryParseOrSanitize(objectMatch[0]);
    }

    const arrayMatch = !value && cleaned.match(/\[[\s\S]*\]/);
    if (!value && arrayMatch) {
      value = tryParseOrSanitize(arrayMatch[0]);
    }
  }

  if (!value) {
    console.error("Failed to parse normalized LLM JSON");
    console.error("Raw response:", cleaned);
    throw new Error("No valid JSON in normalized LLM response");
  }

  return value;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeClampedScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeApplyDecision(value) {
  return String(value).trim().toLowerCase() === "apply" ? "apply" : "skip";
}

function normalizeMatchedFields(value) {
  const matchedFields = value && typeof value === "object" ? value : {};

  return {
    job_titles: normalizeStringArray(matchedFields.job_titles),
    primary_skills: normalizeStringArray(matchedFields.primary_skills),
    secondary_skills: normalizeStringArray(matchedFields.secondary_skills),
    education_level: typeof matchedFields.education_level === "string" ? matchedFields.education_level.trim() : "",
    certifications: normalizeStringArray(matchedFields.certifications),
    domain_experience: normalizeStringArray(matchedFields.domain_experience)
  };
}

function normalizeCandidateMatchResult(value, url) {
  const normalized = value && typeof value === "object" ? value : {};
  const result = {
    match_score: normalizeClampedScore(normalized.match_score),
    apply_decision: normalizeApplyDecision(normalized.apply_decision),
    missing_skills: normalizeStringArray(normalized.missing_skills),
    matched_fields: normalizeMatchedFields(normalized.matched_fields),
    reason: typeof normalized.reason === "string" ? normalized.reason.trim() : ""
  };

  if (typeof url === "string" && url.trim() !== "") {
    result.url = url.trim();
  }

  return result;
}

function getLLMErrorMessage(error, providerName = process.env.LLM_PROVIDER || "ollama") {
  if (error?.code === "ECONNABORTED") {
    return `${providerName} request was aborted`;
  }

  if (error?.code === "ECONNREFUSED") {
    return `${providerName} host refused the connection`;
  }

  if (error?.code === "ENOTFOUND") {
    return `${providerName} host could not be resolved`;
  }

  return error?.message || `Unknown ${providerName} error`;
}

async function generateStructuredJson(payload) {
  const provider = getLLMProvider();
  const result = await provider.generate({
    ...payload,
    moduleType: resolveModuleType(payload?.moduleType)
  });

  return parseStructuredJson(result.text);
}

async function generateNormalizedText(payload) {
  const provider = getLLMProvider();
  return provider.generate({
    ...payload,
    moduleType: resolveModuleType(payload?.moduleType)
  });
}

export async function analyzeJob(candidateProfile, jobData, url) {
  console.log("💡 Starting candidate match analysis...");
  const prompt = promptResumeAnalysis(candidateProfile, jobData);

  try {
    const value = await generateStructuredJson({
      prompt,
      moduleType: "candidate_match"
    });
    const normalized = normalizeCandidateMatchResult(value, url);
    console.log("💡 LLM analysis complete", normalized);
    return normalized;
  } catch (err) {
    const message = getLLMErrorMessage(err, process.env.LLM_PROVIDER || "ollama");
    console.error("❌ LLM error:", message);
    return normalizeCandidateMatchResult({
      match_score: 0,
      apply_decision: "skip",
      missing_skills: [],
      matched_fields: {
        job_titles: [],
        primary_skills: [],
        secondary_skills: [],
        education_level: "",
        certifications: [],
        domain_experience: []
      },
      reason: message
    }, url);
  }
}

export async function analyzeJobMarket(jobDescription) {
  console.log("💡 Starting job analysis...");
  const prompt = promptJobMarketAnalysis(jobDescription);

  try {
    const value = await generateStructuredJson({
      prompt,
      moduleType: "job_analysis"
    });
    return {
      skills: normalizeStringArray(value.skills),
      experience_required: typeof value.experience_required === "string" ? value.experience_required.trim() : "",
      tech_stack: normalizeStringArray(value.tech_stack),
      job_level: typeof value.job_level === "string" ? value.job_level.trim() : "",
      responsibilities: normalizeStringArray(value.responsibilities),
      keywords: normalizeStringArray(value.keywords)
    };
  } catch (err) {
    console.error("❌ LLM analysis error:", getLLMErrorMessage(err, process.env.LLM_PROVIDER || "ollama"));
    return {
      skills: [],
      experience_required: "",
      tech_stack: [],
      job_level: "",
      responsibilities: [],
      keywords: []
    };
  }
}

export async function runConfiguredLLMModule(payload = {}) {
  const moduleType = resolveModuleType(payload.moduleType);

  if (moduleType === "candidate_match") {
    return analyzeJob(payload.candidateProfile, payload.jobData || payload.jobDescription || payload.prompt, payload.url);
  }

  if (moduleType === "job_analysis") {
    return analyzeJobMarket(payload.jobDescription || payload.jobData || payload.prompt || "");
  }

  if (moduleType === "chat") {
    const result = await generateNormalizedText({
      prompt: payload.prompt || payload.jobDescription || payload.jobData || "",
      messages: payload.messages,
      moduleType
    });

    return {
      response: result.text,
      reasoning_content: result.reasoning_content,
      provider: result.provider,
      moduleType
    };
  }

  throw new Error(`Unsupported LLM module type: ${moduleType}`);
}
