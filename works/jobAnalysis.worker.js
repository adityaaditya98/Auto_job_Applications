import "dotenv/config";
import { Worker } from "bullmq";
import { geminiModel } from "../gemini.js";
import { promptResumeAnalysis } from "../prompt/resumeAnalysis.js";
import { analyzeJob } from "../ai/ollamaClient.js";
import { attachWorkerLogging, buildWorkerOptions } from "../bullmq.config.js";

console.log("Job Analysis Workers started");

export const jobAnalysisWorker = attachWorkerLogging(
  new Worker(
    "job-analysis",
    async (job) => {
      console.log("Processing job analysis for job ID:", job.id);
      const { candidateProfile, jobData } = job.data;
      const prompt = promptResumeAnalysis(candidateProfile, jobData);

      try {
        const result = await geminiModel.generateContent(prompt);
        const text = await result.response.text();
        const cleaned = text.replace(/```json|```/g, "").trim();
        const analysis = JSON.parse(cleaned);

        if (analysis.apply_decision === "apply") {
          console.log("Decision: APPLY for this job.");
          console.log(job.data);
        } else {
          console.log("Decision: SKIP this job.");
        }

        return analysis;
      } catch (err) {
        console.error("Gemini error:", err.message);

        return {
          match_score: 0,
          apply_decision: "skip",
          missing_skills: [],
          reason: "Gemini error or quota exceeded"
        };
      }
    },
    buildWorkerOptions({ concurrency: 1 })
  ),
  "job-analysis"
);

export const jobAnalysisLocalWorker = attachWorkerLogging(
  new Worker(
    "job-analysis-local",
    async (job) => {
      const { candidateProfile, jobData, url } = job.data;
      return analyzeJob(candidateProfile, jobData, url);
    },
    buildWorkerOptions({ concurrency: 1 })
  ),
  "job-analysis-local"
);
