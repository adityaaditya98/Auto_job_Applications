import express from "express";
import { jobAnalysisLocalQueue, jobAnalysisQueue } from "../jobQueue.js";
import { candidateProfile } from "../candidateDescription.js";
import { QueueEvents } from "bullmq";
import { connection } from "../redis.js";

const router = express.Router();
const queued = [];
const queuedLocal = []; // keep track of local queued jobs
const analysisStore = []; // in-memory store of completed analysis results

// Listen for completion of local analysis jobs and store their results
const localQueueEvents = new QueueEvents("job-analysis-local", { connection });
localQueueEvents.on("completed", async ({ jobId, returnvalue }) => {
  try {
    console.log("Local job completed:", jobId);
    let result = returnvalue;
    if (typeof result === "string") {
      try { result = JSON.parse(result); } catch (e) { /* keep original string */ }
    }
    analysisStore.push({ jobId, result });
  } catch (err) {
    console.error("Error handling local job completion:", err);
  }
});
localQueueEvents.on("failed", async ({ jobId, failedReason }) => {
  console.warn("Local job failed:", jobId, failedReason);
  analysisStore.push({ jobId, error: failedReason });
});
// Accepts either { allJobDetails: [...] } or { jobData: {...} }
// Will enqueue one job per entry provided. Falls back to demo if no body provided.
router.post("/analyze-jobs", async (req, res) => {
  // console.log("Received request to analyze jobs.");
  try{
    console.log("Queueing job analysis task for job.");
    const jobData=req.body.jobDataDescription;
    const job = await jobAnalysisQueue.add("analyze", {
      candidateProfile,
      jobData,
    });
    console.log("Job analysis task queued with ID:", job.id);
    queued.push({ jobId: job.id });
    console.log("Total jobs queued so far:", queued.length);
    res.status(202).json({ message: "Job analysis queued", jobs: queued });
  } catch (err) {
    console.error("Error enqueueing job:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/analyze-jobs-local", async (req, res) => {
  console.log("Received request to analyze jobs locally (enqueue).");
  try{
    const jobData = req.body.jobDataDescription || req.body.jobData || req.body.allJobDetails;
    const url = req.body.url;
    console.log("Job data received for local analysis. URL:", url);
    if (!jobData) {
      return res.status(400).json({ message: "No job data provided" });
    }

    const queuedJobs = [];

    if (Array.isArray(jobData)) {
      for (const jd of jobData) {
        const job = await jobAnalysisLocalQueue.add("analyze-local", {
          candidateProfile,
          jobData: jd,
          url
        });
        queued.push({ jobId: job.id });
        queuedLocal.push({ jobId: job.id, input: jd });
        queuedJobs.push({ jobId: job.id });
      }
    } else {
      const job = await jobAnalysisLocalQueue.add("analyze-local", {
        candidateProfile,
        jobData,
        url
      });
      queued.push({ jobId: job.id });
      queuedLocal.push({ jobId: job.id, input: jobData });
      queuedJobs.push({ jobId: job.id });
    }

    res.status(202).json({ message: "Job analysis queued (local)", jobs: queuedJobs });
  } catch (err) {
    console.error("Error enqueueing local job(s):", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper endpoints to read/clear stored analysis results
router.get("/analysis-results", (req, res) => {
  res.status(200).json({ results: analysisStore });
});
router.get("/analysis-results/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const item = analysisStore.find(r => String(r.jobId) === String(jobId));
  if (!item) return res.status(404).json({ message: "Result not found" });
  res.status(200).json({ result: item });
});
router.delete("/analysis-results", (req, res) => {
  analysisStore.length = 0;
  res.status(204).send();
});

export default router;
