import express from "express";
import { analyzeJob, analyzeJobMarket } from "../ai/ollamaClient.js";
import { candidateProfile } from "../candidateDescription.js";
import { jobAnalysisLocalQueue } from "../jobQueue.js";
import { fetchGermanyJobs, fetchLinkedInJobs } from "../service.js";

const router = express.Router();

function normalizeSource(source) {
  const normalized = typeof source === "string" ? source.trim().toLowerCase() : "";

  if (normalized === "linkedin") {
    return "linkedin";
  }

  if (
    normalized === "make-it-in-germany"
    || normalized === "make-it-germany"
    || normalized === "germany"
    || normalized === ""
  ) {
    return "germany";
  }

  return normalized;
}

function hasUsableUrl(value) {
  return typeof value === "string" && value.trim() !== "" && value.trim() !== "N/A";
}

function normalizeJobsInput(jobs) {
  if (!Array.isArray(jobs)) {
    return [];
  }

  return jobs
    .map((job) => ({
      jobTitle: typeof job.jobTitle === "string" ? job.jobTitle.trim() : "",
      companyName: typeof job.companyName === "string" ? job.companyName.trim() : "",
      location: typeof job.location === "string" ? job.location.trim() : "",
      jobDescription: typeof job.jobDescription === "string" ? job.jobDescription.trim() : "",
      jobUrl: hasUsableUrl(job.jobUrl) ? job.jobUrl.trim() : ""
    }))
    .filter((job) => hasUsableUrl(job.jobUrl));
}

async function enqueueLocalAnalyses(jobs) {
  const queueableJobs = normalizeJobsInput(jobs)
    .filter((job) => typeof job.jobDescription === "string" && job.jobDescription.trim() !== "");

  const queuedJobs = [];
  for (const job of queueableJobs) {
    const queuedJob = await jobAnalysisLocalQueue.add("analyze-local", {
      candidateProfile,
      jobData: job.jobDescription,
      url: job.jobUrl
    });

    queuedJobs.push({
      jobId: queuedJob.id,
      jobUrl: job.jobUrl
    });
  }

  return queuedJobs;
}

function buildEmptyAnalysis() {
  return {
    skills: [],
    experience_required: "",
    tech_stack: [],
    job_level: "",
    responsibilities: [],
    keywords: []
  };
}

function buildEmptyMatchedFields() {
  return {
    job_titles: [],
    primary_skills: [],
    secondary_skills: [],
    education_level: "",
    certifications: [],
    domain_experience: []
  };
}

function buildMatchingResponse(matchResult) {
  const matchedFields = matchResult?.matched_fields && typeof matchResult.matched_fields === "object"
    ? matchResult.matched_fields
    : buildEmptyMatchedFields();
  const primarySkills = Array.isArray(matchedFields.primary_skills)
    ? matchedFields.primary_skills.filter(Boolean)
    : [];
  const secondarySkills = Array.isArray(matchedFields.secondary_skills)
    ? matchedFields.secondary_skills.filter(Boolean)
    : [];
  const matchedSkills = [...new Set([...primarySkills, ...secondarySkills])];
  const missingSkills = Array.isArray(matchResult?.missing_skills)
    ? matchResult.missing_skills.filter(Boolean)
    : [];
  const hasDomainExperience = Array.isArray(matchedFields.domain_experience)
    && matchedFields.domain_experience.length > 0;
  const reason = typeof matchResult?.reason === "string" ? matchResult.reason.trim() : "";
  const applyDecision = matchResult?.apply_decision === "apply" ? "apply" : "skip";

  return {
    match_score: Number.isFinite(matchResult?.match_score) ? matchResult.match_score : 0,
    apply_decision: applyDecision,
    missing_skills: missingSkills,
    matched_fields: {
      job_titles: Array.isArray(matchedFields.job_titles) ? matchedFields.job_titles.filter(Boolean) : [],
      primary_skills: primarySkills,
      secondary_skills: secondarySkills,
      education_level: typeof matchedFields.education_level === "string" ? matchedFields.education_level.trim() : "",
      certifications: Array.isArray(matchedFields.certifications) ? matchedFields.certifications.filter(Boolean) : [],
      domain_experience: Array.isArray(matchedFields.domain_experience) ? matchedFields.domain_experience.filter(Boolean) : []
    },
    reason,
    matched_skills: matchedSkills,
    experience_gap: hasDomainExperience
      ? "No explicit gap identified by existing matching logic"
      : "unknown",
    recommendation: reason || (applyDecision === "apply" ? "Apply" : "Skip")
  };
}

async function fetchJobsForRequest(body = {}) {
  const source = normalizeSource(body.source || body.provider);

  if (source === "linkedin") {
    return fetchLinkedInJobs(body);
  }

  if (source === "germany") {
    return fetchGermanyJobs(body);
  }

  throw new Error(`Unsupported source: ${source}`);
}

function normalizeSourceLabel(source) {
  return source === "germany" ? "make-it-in-germany" : source;
}

async function respondWithFetchedJobs(res, source, fetcher, body = {}) {
  try {
    const jobs = await fetcher(body);
    const shouldQueueLocalAnalysis = body?.queueLocalAnalysis !== false;
    const localAnalysisJobs = shouldQueueLocalAnalysis
      ? await enqueueLocalAnalyses(jobs)
      : [];

    return res.status(200).json({
      source: normalizeSourceLabel(source),
      jobs,
      localAnalysisQueued: localAnalysisJobs.length,
      localAnalysisJobs
    });
  } catch (error) {
    console.error(`Error in ${normalizeSourceLabel(source)} fetch:`, error);
    return res.status(500).json({
      message: `Unable to fetch jobs from ${normalizeSourceLabel(source)}`,
      error: error.message
    });
  }
}

router.post("/linkedin/fetch", async (req, res) => {
  return respondWithFetchedJobs(res, "linkedin", fetchLinkedInJobs, req.body || {});
});

router.post("/make-it-in-germany/fetch", async (req, res) => {
  return respondWithFetchedJobs(res, "germany", fetchGermanyJobs, req.body || {});
});

router.post("/make-it-germany/fetch", async (req, res) => {
  return respondWithFetchedJobs(res, "germany", fetchGermanyJobs, req.body || {});
});

router.post("/fetch", async (req, res) => {
  const source = normalizeSource(req.body?.source || req.body?.provider);

  if (source === "linkedin") {
    return respondWithFetchedJobs(res, source, fetchLinkedInJobs, req.body || {});
  }

  if (source === "germany") {
    return respondWithFetchedJobs(res, source, fetchGermanyJobs, req.body || {});
  }

  return res.status(400).json({
    message: "source must be one of linkedin, make-it-in-germany, make-it-germany, or germany"
  });
});

router.post("/analyze", async (req, res) => {
  const jobDescription = req.body?.jobDescription || req.body?.jobDataDescription;
  if (!jobDescription) {
    return res.status(400).json({ message: "jobDescription is required" });
  }

  try {
    const analysis = await analyzeJobMarket(jobDescription);
    return res.status(200).json({ analysis });
  } catch (error) {
    console.error("Error in /jobs/analyze:", error);
    return res.status(500).json({
      message: "Unable to analyze job description",
      error: error.message
    });
  }
});

router.post("/match", async (req, res) => {
  const jobDescription = req.body?.jobDescription || req.body?.jobDataDescription;
  const jobUrl = req.body?.jobUrl;

  if (!jobDescription) {
    return res.status(400).json({ message: "jobDescription is required" });
  }

  try {
    const matchResult = await analyzeJob(candidateProfile, jobDescription, jobUrl);
    return res.status(200).json({
      matching: buildMatchingResponse(matchResult)
    });
  } catch (error) {
    console.error("Error in /jobs/match:", error);
    return res.status(500).json({
      message: "Unable to match candidate to job",
      error: error.message
    });
  }
});

router.post("/full-analysis", async (req, res) => {
  try {
    let jobs = normalizeJobsInput(req.body?.jobs);
    if (jobs.length === 0) {
      jobs = await fetchJobsForRequest(req.body || {});
    }

    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const analysis = job.jobDescription
          ? await analyzeJobMarket(job.jobDescription)
          : buildEmptyAnalysis();
        const matchResult = job.jobDescription
          ? await analyzeJob(candidateProfile, job.jobDescription, job.jobUrl)
          : null;

        return {
          ...job,
          analysis,
          matching: matchResult ? buildMatchingResponse(matchResult) : buildMatchingResponse(null)
        };
      })
    );

    const response = { jobs: enrichedJobs };
    if (enrichedJobs.length === 1) {
      response.analysis = enrichedJobs[0].analysis;
      response.matching = enrichedJobs[0].matching;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in /jobs/full-analysis:", error);
    return res.status(500).json({
      message: "Unable to complete full analysis",
      error: error.message
    });
  }
});

export default router;
