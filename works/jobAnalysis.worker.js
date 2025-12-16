import { Worker } from "bullmq";
import { redisConnection } from "../redis.js";
import openai from "../openai.js";

new Worker(
  "job-analysis",
  async (job) => {
    const { candidateProfile, jobData } = job.data;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Match resume JSON with job JSON and return STRICT JSON only."
        },
        {
          role: "user",
          content: `
CANDIDATE_PROFILE:
${JSON.stringify(candidateProfile, null, 2)}

JOB_DATA:
${JSON.stringify(jobData, null, 2)}

Return ONLY this JSON:
{
  "match_score": 0,
  "apply_decision": "apply | skip",
  "missing_skills": [],
  "reason": ""
}
`
        }
      ],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log("Analysis Result:", result);

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 2
  }
);
