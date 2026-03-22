export const promptJobMarketAnalysis = (jobDescription) => `
You are an expert job market analyst.

Analyze the job description and return ONLY valid JSON.

Extract:
- skills
- experience_required
- tech_stack
- job_level
- responsibilities
- keywords

Job Description:
${jobDescription}
`;
