import { createClient } from "redis";

let client;
let connectPromise;
let unavailable = false;

const getClient = async () => {
  if (!process.env.REDIS_URL || unavailable) return null;

  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 1_000, reconnectStrategy: false },
    });
    client.on("error", (error) => {
      console.warn("Redis cache unavailable; continuing without cache:", error.message);
    });
  }

  if (!client.isOpen) {
    connectPromise ??= client.connect().catch((error) => {
      unavailable = true;
      console.warn("Redis cache connection failed; continuing without cache:", error.message);
      return null;
    });
    await connectPromise;
  }

  return client.isOpen ? client : null;
};

export const getCachedJson = async (key) => {
  try {
    const redis = await getClient();
    const value = redis ? await redis.get(key) : null;
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("Redis cache read failed; continuing without cache:", error.message);
    return null;
  }
};

export const setCachedJson = async (key, value, ttlSeconds) => {
  try {
    const redis = await getClient();
    if (redis) await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.warn("Redis cache write failed; continuing without cache:", error.message);
  }
};

const PUBLIC_SESSIONS_VERSION_KEY = "public-sessions:version";

export const getPublicSessionsCacheVersion = async () => {
  try {
    const redis = await getClient();
    return (redis && (await redis.get(PUBLIC_SESSIONS_VERSION_KEY))) || "1";
  } catch {
    return "1";
  }
};

// Incrementing a version leaves old keys to expire naturally and avoids SCAN/KEYS.
export const invalidatePublicSessionsCache = async () => {
  try {
    const redis = await getClient();
    if (redis) await redis.incr(PUBLIC_SESSIONS_VERSION_KEY);
  } catch (error) {
    console.warn("Redis cache invalidation failed:", error.message);
  }
};
