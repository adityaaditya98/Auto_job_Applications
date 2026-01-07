export const promptResumeAnalysis = (candidateProfile, jobData) => `
You are a recruiter AI.

CANDIDATE_PROFILE (TEXT):
${candidateProfile}

JOB_DATA (TEST):
${jobData}

Return ONLY valid JSON in this format:
{
  "match_score": 0,
  "apply_decision": "apply | skip",
  "missing_skills": [],
  "reason": ""
}
`