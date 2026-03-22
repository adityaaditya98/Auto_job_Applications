import { Queue } from "bullmq";
import { buildQueueOptions } from "./bullmq.config.js";

export const jobAnalysisQueue = new Queue("job-analysis", buildQueueOptions());

export const jobAnalysisLocalQueue = new Queue("job-analysis-local", buildQueueOptions());

export const fetchQueue = new Queue("fetch-jobs", buildQueueOptions());

export const extractQueue = new Queue("extract-jobs", buildQueueOptions());
