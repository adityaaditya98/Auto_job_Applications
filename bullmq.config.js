import { connection } from "./redis.js";

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULT_ATTEMPTS = toPositiveInteger(process.env.BULLMQ_ATTEMPTS, 3);
const DEFAULT_BACKOFF_DELAY_MS = toPositiveInteger(process.env.BULLMQ_BACKOFF_DELAY_MS, 3000);
const DEFAULT_JOB_TIMEOUT_MS = toPositiveInteger(process.env.BULLMQ_JOB_TIMEOUT_MS, 20 * 60 * 1000);
const DEFAULT_LOCK_DURATION_MS = toPositiveInteger(process.env.BULLMQ_LOCK_DURATION_MS, 5 * 60 * 1000);
const DEFAULT_STALLED_INTERVAL_MS = toPositiveInteger(process.env.BULLMQ_STALLED_INTERVAL_MS, 30 * 1000);
const DEFAULT_MAX_STALLED_COUNT = toPositiveInteger(process.env.BULLMQ_MAX_STALLED_COUNT, 3);

export function buildQueueOptions() {
  return {
    connection,
    defaultJobOptions: {
      attempts: DEFAULT_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: DEFAULT_BACKOFF_DELAY_MS
      },
      timeout: DEFAULT_JOB_TIMEOUT_MS,
      removeOnComplete: false,
      removeOnFail: false
    }
  };
}

export function buildWorkerOptions(overrides = {}) {
  return {
    connection,
    concurrency: 1,
    lockDuration: DEFAULT_LOCK_DURATION_MS,
    stalledInterval: DEFAULT_STALLED_INTERVAL_MS,
    maxStalledCount: DEFAULT_MAX_STALLED_COUNT,
    ...overrides
  };
}

export function attachWorkerLogging(worker, queueName) {
  worker.on("active", (job) => {
    console.log("[" + queueName + "] active job " + job?.id);
  });

  worker.on("completed", (job) => {
    console.log("[" + queueName + "] completed job " + job?.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[" + queueName + "] failed job " + job?.id + ":", error?.message || error);
  });

  worker.on("stalled", (jobId) => {
    console.warn("[" + queueName + "] stalled job " + jobId);
  });

  worker.on("error", (error) => {
    console.error("[" + queueName + "] worker error:", error?.message || error);
  });

  return worker;
}
