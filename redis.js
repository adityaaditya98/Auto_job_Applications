import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

connection.on("connect", () => {
  console.log("Redis: connected");
});
connection.on("ready", () => {
  console.log("Redis: ready");
});
connection.on("error", (err) => {
  console.error("Redis error:", err);
});
connection.on("close", () => {
  console.warn("Redis connection closed");
});
