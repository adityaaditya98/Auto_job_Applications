import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../redis.js";
import { geminiModel } from "../gemini.js";
import { promptResumeAnalysis } from "../prompt/resumeAnalysis.js";
import { analyzeJob } from "../ai/ollamaClient.js";
console.log("🚀 Gemini Job Analysis Worker started");

new Worker(
  "job-analysis",
  async (job) => {
    console.log("Processing job analysis for job ID:", job.id);
    const { candidateProfile, jobData } = job.data;
  //  console.log("Job data:", jobData.length);
  //   console.log("Candidate profile length:", candidateProfile.length);
    const prompt = promptResumeAnalysis(candidateProfile, jobData);

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = await result.response.text();

      // Gemini sometimes adds markdown – clean it
      const cleaned = await text.replace(/```json|```/g, "").trim();

      const analysis = await JSON.parse(cleaned);

      if(analysis.apply_decision === "apply"){
        await console.log("✅ Decision: APPLY for this job.");
        await console.log(job.data);
      }else{
        await console.log("❌ Decision: SKIP this job.");
      }

      return await analysis;

    } catch (err) {
      console.error("❌ Gemini error:", err.message);

      return {
        match_score: 0,
        apply_decision: "skip",
        missing_skills: [],
        reason: "Gemini error or quota exceeded"
      };
    }
  },
  {
    connection: connection,
    concurrency: 1 // 🔑 VERY IMPORTANT
  }
);

new Worker("job-analysis-local", async (job) => {
  const { candidateProfile, jobData } = job.data;
  // console.log("last-check job data:",jobData);
  return await analyzeJob(candidateProfile, jobData);
}, {
  connection: connection,
  concurrency: 1
});

