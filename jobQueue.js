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
    removeOnComplete: false,
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
    removeOnComplete: false,
    removeOnFail: false
  }
});

export const fetchQueue = new Queue("fetch-jobs", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});

export const extractQueue = new Queue("extract-jobs", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});


