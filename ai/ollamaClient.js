import { promptResumeAnalysis } from "../prompt/resumeAnalysis.js";
import axios from "axios";
export async function analyzeJob(candidateProfile, jobData){
    console.log("💡 Starting Ollama job analysis...");
const prompt = promptResumeAnalysis(candidateProfile, jobData);
console.log("💡 Prompt prepared for Ollama.",jobData);
console.log("checking job data in ollama client:",jobData);
try{
const res = await axios.post("http://ollama:11434/api/generate", {
  model: "phi3:latest",
  prompt: "Return ONLY valid JSON: {\"status\":\"local ai working\"}",
  stream: false
});

  console.log("💡 Ollama analysis response received");
  console.log("Ollama response status:", res.status);
  const data = await res.json();
  const value = JSON.parse(data.response.replace(/```json|```/g, "").trim());
  console.log("💡 Ollama analysis complete", value);
  return value;
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
