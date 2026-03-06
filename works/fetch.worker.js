import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../redis.js";
import { fetchJobDetails, getJobDetailsInformation } from "../service.js";
import { jobAnalysisLocalQueue } from "../jobQueue.js";
import { candidateProfile } from "../candidateDescription.js";

console.log("🚀 Fetch Worker started (fetch-jobs)");

new Worker(
  "fetch-jobs",
  async (job) => {
    console.log("Processing fetch job:", job.id, job.data);
    const page = Number(job.data.page || 0);
    const jobs = await fetchJobDetails(page);

    if (!jobs || jobs.length === 0) {
      console.log("No jobs found on page", page);
      return { jobs: [] };
    }

    // simply return the raw job list; downstream handlers can enqueue further work
    console.log(`Fetched ${jobs.length} jobs from page ${page}`);
    return { jobs, page };
  },
  {
    connection: connection,
    concurrency: 1
  }
);
