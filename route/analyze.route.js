import express from "express";
import { jobAnalysisQueue } from "../jobQueue.js";
import { candidateProfile } from "../candidateDescription.js";
import demo from "../demo.js";

const router = express.Router();

// Accepts either { allJobDetails: [...] } or { jobData: {...} }
// Will enqueue one job per entry provided. Falls back to demo if no body provided.
router.post("/analyze-jobs", async (req, res) => {
  console.log("Received request to analyze jobs.");
  try {
    const { allJobDetails, jobData } = demo;

    let jobsToQueue = [];
    if (jobData) {
      jobsToQueue = Array.isArray(jobData) ? jobData : [jobData];
    } else if (allJobDetails) {
      jobsToQueue = Array.isArray(allJobDetails) ? allJobDetails : [allJobDetails];
    } else if (demo) {
      jobsToQueue = [demo];
    }

    if (jobsToQueue.length === 0) {
      return res.status(400).json({ error: "No job data provided" });
    }

    const queued = [];
    for (const jd of jobsToQueue) {
      console.log("Queueing job analysis task for job.");
      const job = await jobAnalysisQueue.add("analyze", {
        candidateProfile,
        jobData: jd
      });
      queued.push({ jobId: job.id });
      console.log("Job analysis task queued with ID:", job.id);
    }

    res.status(202).json({ message: "Job analysis queued", jobs: queued });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
