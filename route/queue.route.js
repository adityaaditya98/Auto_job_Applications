import express from "express";
import { jobAnalysisQueue, jobAnalysisLocalQueue, fetchQueue, extractQueue } from "../jobQueue.js";

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

// ===== Fetch Queue Endpoints =====
router.get("/queue/status-fetch", async (req, res) => {
  try {
    const counts = await fetchQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    res.json({
      queue: "fetch-jobs",
      counts
    });
  } catch (error) {
    console.error("Fetch queue status error:", error);
    res.status(500).json({
      error: "Failed to get fetch queue status"
    });
  }
});

router.get("/queue/failed-fetch", async (req, res) => {
  try {
    const failedJobs = await fetchQueue.getJobs(["failed"], 0, -1);

    const results = failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason || (j.stacktrace && j.stacktrace.join("\n")),
      data: j.data || null
    }));

    res.json({ queue: "fetch-jobs", failed: results });
  } catch (error) {
    console.error("Failed to fetch fetch queue failed jobs:", error);
    res.status(500).json({ error: "Failed to fetch fetch queue failed jobs" });
  }
});

router.delete("/queue/clear-fetch", async (req, res) => {
  try {
    await fetchQueue.obliterate({ force: true });

    res.json({
      message: "✅ All jobs deleted from fetch-jobs queue"
    });
  } catch (error) {
    console.error("Fetch queue clear error:", error);
    res.status(500).json({
      error: "Failed to clear fetch queue"
    });
  }
});

// ===== Extract Queue Endpoints =====
router.get("/queue/status-extract", async (req, res) => {
  try {
    const counts = await extractQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    res.json({
      queue: "extract-jobs",
      counts
    });
  } catch (error) {
    console.error("Extract queue status error:", error);
    res.status(500).json({
      error: "Failed to get extract queue status"
    });
  }
});

router.get("/queue/failed-extract", async (req, res) => {
  try {
    const failedJobs = await extractQueue.getJobs(["failed"], 0, -1);

    const results = failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason || (j.stacktrace && j.stacktrace.join("\n")),
      data: j.data || null
    }));

    res.json({ queue: "extract-jobs", failed: results });
  } catch (error) {
    console.error("Failed to fetch extract queue failed jobs:", error);
    res.status(500).json({ error: "Failed to fetch extract queue failed jobs" });
  }
});

router.delete("/queue/clear-extract", async (req, res) => {
  try {
    await extractQueue.obliterate({ force: true });

    res.json({
      message: "✅ All jobs deleted from extract-jobs queue"
    });
  } catch (error) {
    console.error("Extract queue clear error:", error);
    res.status(500).json({
      error: "Failed to clear extract queue"
    });
  }
});

// ===== All Queues Status Summary =====
router.get("/queue/status-all", async (req, res) => {
  try {
    const analysisStatus = await jobAnalysisQueue.getJobCounts(
      "waiting", "active", "completed", "failed", "delayed"
    );
    const analysisLocalStatus = await jobAnalysisLocalQueue.getJobCounts(
      "waiting", "active", "completed", "failed", "delayed"
    );
    const fetchStatus = await fetchQueue.getJobCounts(
      "waiting", "active", "completed", "failed", "delayed"
    );
    const extractStatus = await extractQueue.getJobCounts(
      "waiting", "active", "completed", "failed", "delayed"
    );

    res.json({
      summary: {
        "job-analysis": analysisStatus,
        "job-analysis-local": analysisLocalStatus,
        "fetch-jobs": fetchStatus,
        "extract-jobs": extractStatus
      }
    });
  } catch (error) {
    console.error("All queue status error:", error);
    res.status(500).json({
      error: "Failed to get all queue statuses"
    });
  }
});

// ===== Completed Jobs Endpoints =====
router.get("/queue/completed", async (req, res) => {
  try {
    const completedJobs = await jobAnalysisQueue.getJobs(["completed"], 0, -1);

    const results = completedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      returnValue: j.returnvalue,
      completedOn: j.finishedOn,
      data: j.data || null
    }));

    res.json({ queue: "job-analysis", completed: results });
  } catch (error) {
    console.error("Failed to fetch completed jobs:", error);
    res.status(500).json({ error: "Failed to fetch completed jobs" });
  }
});

router.get("/queue/completed-local", async (req, res) => {
  try {
    const completedJobs = await jobAnalysisLocalQueue.getJobs(["completed"], 0, -1);

    const results = completedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      returnValue: j.returnvalue,
      completedOn: j.finishedOn,
      data: j.data || null
    }));

    res.json({ queue: "job-analysis-local", completed: results });
  } catch (error) {
    console.error("Failed to fetch completed local jobs:", error);
    res.status(500).json({ error: "Failed to fetch completed local jobs" });
  }
});

router.get("/queue/completed-fetch", async (req, res) => {
  try {
    const completedJobs = await fetchQueue.getJobs(["completed"], 0, -1);

    const results = completedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      returnValue: j.returnvalue,
      completedOn: j.finishedOn,
      data: j.data || null
    }));

    res.json({ queue: "fetch-jobs", completed: results });
  } catch (error) {
    console.error("Failed to fetch completed fetch jobs:", error);
    res.status(500).json({ error: "Failed to fetch completed fetch jobs" });
  }
});

router.get("/queue/completed-extract", async (req, res) => {
  try {
    const completedJobs = await extractQueue.getJobs(["completed"], 0, -1);

    const results = completedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      returnValue: j.returnvalue,
      completedOn: j.finishedOn,
      data: j.data || null
    }));

    res.json({ queue: "extract-jobs", completed: results });
  } catch (error) {
    console.error("Failed to fetch completed extract jobs:", error);
    res.status(500).json({ error: "Failed to fetch completed extract jobs" });
  }
});

export default router;
