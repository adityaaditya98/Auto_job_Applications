import express from "express";
import { jobAnalysisLocalQueue, jobAnalysisQueue } from "../jobQueue.js";
import { candidateProfile } from "../candidateDescription.js";

const router = express.Router();
const queued = [];
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
  console.log("Received request to analyze jobs locally.");
  try{
    const jobData = req.body.jobDataDescription;
    // console.log("checking job data:", jobData);
    const job = await jobAnalysisLocalQueue.add("analyze-local", {
      candidateProfile,
      jobData,
    });
    queued.push({ jobId: job.id });
    res.status(202).json({ message: "Job analysis queued (local)", jobs: queued });
  } catch (err) {
    console.error("Error analyzing job locally:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
