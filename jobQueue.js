import { Queue } from "bullmq";
import { connection } from "./redis.js";

export const jobAnalysisQueue = new Queue("job-analysis", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

export const jobAnalysisLocalQueue = new Queue("job-analysis-local", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

