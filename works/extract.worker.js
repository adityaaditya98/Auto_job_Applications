import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../redis.js";
import { getJobDetailsInformation } from "../service.js";
import { jobAnalysisLocalQueue } from "../jobQueue.js";
import { candidateProfile } from "../candidateDescription.js";

console.log("🚀 Extract Worker started (extract-jobs)");

new Worker(
  "extract-jobs",
  async (job) => {
    console.log("Processing extract job:", job.id, job.data);
    const url = job.data.url;
    if (!url) {
      console.warn("No URL provided for extract job", job.id);
      return { enqueued: 0 };
    }

    try {
      const details = await getJobDetailsInformation(url);
      if (!details) {
        console.warn("No details returned for URL:", url);
        return { enqueued: 0 };
      }

      // enqueue the analysis work as before
      await jobAnalysisLocalQueue.add("analyze-local", {
        candidateProfile,
        jobData: details.description || details,
        url: details.url || url
      });

      console.log("Enqueued analyze-local job for:", url);
      return { enqueued: 1, details };
    } catch (err) {
      console.error("Error extracting details for URL:", url, err.message || err);
      return { enqueued: 0, error: err.message || String(err) };
    }
  },
  {
    connection: connection,
    concurrency: 1
  }
);
