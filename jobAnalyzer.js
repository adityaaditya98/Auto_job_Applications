import openai from "./openai.js";
import { candidateProfile } from "./candidateDescription.js";

export async function analyzeJobDescription(jobDescription, candidateProfile) {
  const prompt = `
You are an expert technical recruiter.

Candidate profile:
${candidateProfile}

Job description:
${jobDescription}

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

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You only return valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  return JSON.parse(response.choices[0].message.content);
}
