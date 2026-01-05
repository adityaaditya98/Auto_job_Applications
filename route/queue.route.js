import express from "express";
import { Queue } from "bullmq";
import { connection } from "../redis.js";

const router = express.Router();

const jobAnalysisQueue = new Queue("job-analysis", {
  connection: connection
});

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

export default router;
