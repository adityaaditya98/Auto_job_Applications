export const promptResumeAnalysis = (candidateProfile, jobData) => `
You are an automated recruitment evaluation engine.

Compare CANDIDATE_PROFILE and JOB_DATA using strict structured matching.

CANDIDATE_PROFILE:
${candidateProfile}

JOB_DATA:
${jobData}

Return ONE valid JSON object only.
Never use markdown or code blocks.

JSON SCHEMA:
{
  "match_score": 0,
  "apply_decision": "apply",
  "missing_skills": [],
  "matched_fields": {
    "job_titles": [],
    "primary_skills": [],
    "secondary_skills": [],
    "education_level": "",
    "certifications": [],
    "domain_experience": []
  },
  "reason": ""
}

MANDATORY DECISION RULES:
- match_score integer 0–100.
- apply_decision:
    - "apply" ONLY if ALL are true:
        1. At least 60% of JOB_DATA primary_skills appear in CANDIDATE_PROFILE.
        2. Candidate education level is not lower than required.
        3. Candidate meets or exceeds ALL language requirements stated in JOB_DATA.
- missing_skills:
    - include only skills explicitly mentioned in JOB_DATA but absent in CANDIDATE_PROFILE.
- matched_fields:
    - include ONLY values present in BOTH texts.
- reason:
    - exactly one sentence, max 20 words.
- Never include trailing commas.
- Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().
Output must be valid JSON parseable by JSON.parse().

LANGUAGE EVALUATION RULE:
- If JOB_DATA mentions any required language with proficiency level (e.g., German B2, English C1, French Fluent, Spanish Native):
    - treat missing or lower language level in CANDIDATE_PROFILE as a critical mismatch.
    - in such case force apply_decision = "skip".


`