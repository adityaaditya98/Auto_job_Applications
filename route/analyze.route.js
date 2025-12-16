import express from "express";
import { jobAnalysisQueue } from "../jobQueue.js";
import { candidateProfile } from "../candidateDescription.js";

const router = express.Router();

router.post("/analyze-job", async (req, res) => {
  try {
    const { jobData } = req.body;

    if (!jobData) {
      return res.status(400).json({ error: "jobData is required" });
    }

    const job = await jobAnalysisQueue.add("analyze", {
      candidateProfile,
      jobData
    });

    res.status(202).json({
      message: "Job analysis queued",
      jobId: job.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
