import express from "express";
import { jobAnalysisQueue, jobAnalysisLocalQueue } from "../jobQueue.js";

const router = express.Router();

// Using shared queues from `jobQueue.js`

/**
 * DELETE /api/queue/clear
 * Clears ALL jobs from the queue (waiting, delayed, active, completed, failed)
 */
router.delete("/queue/clear", async (req, res) => {
  try {
    await jobAnalysisQueue.obliterate({ force: true });

    res.json({
      message: "✅ All jobs deleted from job-analysis queue"
    });
  } catch (error) {
    console.error("Queue clear error:", error);
    res.status(500).json({
      error: "Failed to clear queue"
    });
  }
});

router.delete("/queue/clear-local", async (req, res) => {
  try {
    await jobAnalysisLocalQueue.obliterate({ force: true });

    res.json({
      message: "✅ All jobs deleted from job-analysis-local queue"
    });
  } catch (error) {
    console.error("Local queue clear error:", error);
    res.status(500).json({
      error: "Failed to clear local queue"
    });
  }
});

router.get("/queue/status", async (req, res) => {
  try {
    const counts = await jobAnalysisQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    res.json({
      queue: "job-analysis",
      counts
    });
  } catch (error) {
    console.error("Queue status error:", error);
    res.status(500).json({
      error: "Failed to get queue status"
    });
  }
});

router.get("/queue/status-local", async (req, res) => {
  try {
    const counts = await jobAnalysisLocalQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    res.json({
      queue: "job-analysis-local",
      counts
    });
  } catch (error) {
    console.error("Local queue status error:", error);
    res.status(500).json({
      error: "Failed to get local queue status"
    });
  }
});

// Return failed jobs with failure messages and original job data as JSON
router.get("/queue/failed", async (req, res) => {
  try {
    const failedJobs = await jobAnalysisQueue.getJobs(["failed"], 0, -1);

    const results = failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason || (j.stacktrace && j.stacktrace.join("\n")),
      data: j.data || null
    }));

    res.json({ queue: "job-analysis", failed: results });
  } catch (error) {
    console.error("Failed to fetch failed jobs:", error);
    res.status(500).json({ error: "Failed to fetch failed jobs" });
  }
});

router.get("/queue/failed-local", async (req, res) => {
  try {
    const failedJobs = await jobAnalysisLocalQueue.getJobs(["failed"], 0, -1);

    const results = failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason || (j.stacktrace && j.stacktrace.join("\n")),
      data: j.data || null
    }));

    res.json({ queue: "job-analysis-local", failed: results });
  } catch (error) {
    console.error("Failed to fetch failed local jobs:", error);
    res.status(500).json({ error: "Failed to fetch failed local jobs" });
  }
});

export default router;
