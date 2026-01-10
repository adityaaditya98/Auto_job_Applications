import { promptResumeAnalysis } from "../prompt/resumeAnalysis.js";
import axios from "axios";
export async function analyzeJob(candidateProfile, jobData , url){
    console.log("💡 Starting Ollama job analysis...");
const prompt = promptResumeAnalysis(candidateProfile, jobData);
// console.log("💡 Prompt prepared for Ollama.",jobData);
// console.log("checking job data in ollama client:",jobData);
try{
const res = await axios.post(process.env.OLLAMA_HOST + "/api/generate", {
  model: "deepseek-r1:1.5b",
  prompt: prompt,
  stream: false
});

  console.log("💡 Ollama analysis response received");
  // console.log(jobData);
  // console.log("Ollama response status:", res.status);
  const data = res.data;
  let responseText = "";
  if (typeof data === "string") {
    responseText = data;
  } else if (data.response) {
    responseText = data.response;
  } else if (data.responses && Array.isArray(data.responses) && data.responses[0]?.content) {
    responseText = data.responses[0].content;
  } else {
    responseText = JSON.stringify(data);
  }

  const cleaned = responseText.replace(/```json|```/g, "").trim();

  // Try to parse directly, otherwise attempt robust extraction and sanitization
  function tryParseOrSanitize(candidate) {
    try { return JSON.parse(candidate); } catch (e) {
      // sanitization steps for common model output issues
      let s = candidate;
      // remove trailing commas before ] or }
      s = s.replace(/,\s*(?=[}\]])/g, "");
      // convert single-quoted simple tokens to double quotes
      s = s.replace(/([:\[\{,\s])'([^']*?)'(?=[,\]}\s])/g, '$1"$2"');
      // convert bullet lists inside arrays into JSON arrays
      s = s.replace(/\[([\s\S]*?)\]/g, (m, inner) => {
        if (/"|:|,/.test(inner)) return m.replace(/,\s*(?=[\]\}])/g, '');
        const lines = inner.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const items = lines.map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
        if (items.length === 0) return m;
        return JSON.stringify(items);
      });
      // handle keys like missing_skills: followed by bullets (no brackets)
      s = s.replace(/"?missing_skills"?\s*:\s*\n((?:\s*[-*].+\n?)+)/im, (m, bullets) => {
        const items = bullets.split(/\r?\n/).map(l => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
        return '"missing_skills": ' + JSON.stringify(items);
      });
      // wrap bare array items with quotes
      s = s.replace(/(\[)\s*([^\"\]\[][^\]]*?)\s*(\])/g, (m, open, inner, close) => {
        const parts = inner.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean).map(p => {
          if (/^\".*\"$/.test(p) || /^\'.*\'$/.test(p)) return p;
          return JSON.stringify(p.replace(/^[-*]\s*/, ''));
        });
        return '[' + parts.join(',') + ']';
      });

      try { return JSON.parse(s); } catch (e2) { return null; }
    }
  }

  let value = tryParseOrSanitize(cleaned);
  if (!value) {
    // scan for first balanced JSON-like chunk
    const text = cleaned;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{' || text[i] === '[') {
        const startChar = text[i];
        const endChar = startChar === '{' ? '}' : ']';
        let depth = 0;
        for (let j = i; j < text.length; j++) {
          const ch = text[j];
          if (ch === startChar) depth++;
          else if (ch === endChar) depth--;
          if (depth === 0) {
            const candidate = text.slice(i, j + 1);
            const parsed = tryParseOrSanitize(candidate);
            if (parsed) { value = parsed; break; }
            break; // try next possible start
          }
        }
      }
      if (value) break;
    }
  }

  if (!value) {
    // final regex fallback
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) value = tryParseOrSanitize(objMatch[0]);
    const arrMatch = !value && cleaned.match(/\[[\s\S]*\]/);
    if (!value && arrMatch) value = tryParseOrSanitize(arrMatch[0]);
  }

  if (!value) {
    console.error("Failed to parse Ollama JSON: no valid JSON found or JSON is malformed after sanitization");
    console.error("Raw response:", cleaned);
    throw new Error("No valid JSON in Ollama response");
  }

  console.log("💡 Ollama analysis complete", {...value,url});
  return {...value, url};
}catch(err){
    console.error("❌ Ollama error:", err.message);
    return {
        match_score: 0,
        apply_decision: "skip",
        missing_skills: [],
        reason: "Ollama error or quota exceeded"
      };
    }
}
