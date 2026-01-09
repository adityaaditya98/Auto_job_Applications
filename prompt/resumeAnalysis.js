export const promptResumeAnalysis = (candidateProfile, jobData) => `
You are an automated recruitment evaluation engine.

CANDIDATE_PROFILE:
${candidateProfile}

JOB_DATA:
${jobData}

Return ONE valid JSON object only.

CRITICAL:
- Never use trailing commas.
- All arrays must be valid JSON.
- All object values must be strings or arrays (no null).
- Every field must exist even if empty.

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

Rules:
- match_score integer 0-100.
- apply_decision "apply" only if match_score >= 60.
- missing_skills must be skills present in JOB_DATA but absent in CANDIDATE_PROFILE.
- matched_fields arrays must contain only values present in BOTH texts.
- reason must be one sentence, max 20 words.
- Output must be parsable by JSON.parse() without modification.
Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

Output must be parsable by JSON.parse() without modification.

`