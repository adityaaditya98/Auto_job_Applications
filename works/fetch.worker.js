import "dotenv/config";
import { Worker } from "bullmq";
import { fetchJobDetails } from "../service.js";
import { attachWorkerLogging, buildWorkerOptions } from "../bullmq.config.js";

console.log("Fetch Worker started (fetch-jobs)");

export const fetchWorker = attachWorkerLogging(
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

      console.log("Fetched " + jobs.length + " jobs from page " + page);
      return { jobs, page };
    },
    buildWorkerOptions({ concurrency: 1 })
  ),
  "fetch-jobs"
);
