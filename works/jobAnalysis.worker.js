import { Worker } from "bullmq";
import { connection } from "../redis.js";
import openai from "../openai.js";
new Worker(
  "job-analysis",
  async (job) => {
    const { candidateProfile, jobData } = job.data;
    console.log("Analyzing job ID:", job.id);
    console.log("Job Data:", jobData);
    console.log("Candidate Profile:", candidateProfile);
    const prompt = `
You are an expert technical recruiter.

Candidate profile:
${candidateProfile}

Job description:
${jobData}

Analyze and return STRICT JSON in this format:

{
  "role_summary": "",
  "required_skills": [],
  "experience_level": "",
  "location_type": "remote | hybrid | onsite | unknown",
  "match_score": 0,
  "apply_decision": "apply | skip",
  "reason": "",
  "short_tailored_note": ""
}
`;
  try{
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You only return valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });
  console.log(JSON.parse(response.choices[0].message.content));
  console.log("Completed analysis for job ID:", job.id);
  return JSON.parse(response.choices[0].message.content);
}catch(err){
  console.error("Error during OpenAI API call for job ID:", job.id, err);
  throw err;
}

  },
  {
    connection,
    concurrency: 2
  }
);
