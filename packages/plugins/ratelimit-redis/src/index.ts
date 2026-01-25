import type {
  RateLimitClient,
  RateLimitConfig,
  RateLimitResult,
} from "@karakeep/shared/ratelimiting";
import { PluginProvider } from "@karakeep/shared/plugins";
import Redis from "ioredis";

export class RedisRateLimiter implements RateLimitClient {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async checkRateLimit(
    config: RateLimitConfig,
    key: string,
  ): Promise<RateLimitResult> {
    if (!key) {
      return { allowed: true };
    }

    const rateLimitKey = `ratelimit:${config.name}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use a Lua script to ensure atomicity
      // This script:
      // 1. Removes old entries outside the time window
      // 2. Counts current entries
      // 3. Adds new entry if under limit
      // 4. Sets expiration on the key
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local maxRequests = tonumber(ARGV[3])
        local windowStart = now - window

        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

        -- Count current requests
        local current = redis.call('ZCARD', key)

        if current < maxRequests then
          -- Add new request
          redis.call('ZADD', key, now, now .. ':' .. math.random())
          -- Set expiration (window in milliseconds converted to seconds, plus 1 for safety)
          redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
          return {1, 0} -- allowed, resetInSeconds
        else
          -- Get the oldest entry to calculate reset time
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local resetTime = tonumber(oldest[2]) + window
          local resetInSeconds = math.ceil((resetTime - now) / 1000)
          return {0, resetInSeconds} -- not allowed, resetInSeconds
        end
      `;

      const result = (await this.redis.eval(
        luaScript,
        1,
        rateLimitKey,
        now.toString(),
        config.windowMs.toString(),
        config.maxRequests.toString(),
      )) as [number, number];

      const [allowed, resetInSeconds] = result;

      if (allowed === 1) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          resetInSeconds: resetInSeconds,
        };
      }
    } catch (error) {
      // On Redis error, fail open (allow the request)
      console.error("Redis rate limit error:", error);
      return { allowed: true };
    }
  }

  reset(config: RateLimitConfig, key: string) {
    const rateLimitKey = `ratelimit:${config.name}:${key}`;
    this.redis.del(rateLimitKey).catch((error) => {
      console.error("Redis rate limit reset error:", error);
    });
  }

  clear() {
    // Clear all rate limit keys
    this.redis
      .keys("ratelimit:*")
      .then((keys) => {
        if (keys.length > 0) {
          return this.redis.del(...keys);
        }
      })
      .catch((error) => {
        console.error("Redis rate limit clear error:", error);
      });
  }

  async disconnect() {
    await this.redis.quit();
  }
}

export interface RedisRateLimiterOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean;
  url?: string;
}

export class RedisRateLimitProvider implements PluginProvider<RateLimitClient> {
  private client: RedisRateLimiter | null = null;
  private options: RedisRateLimiterOptions;

  constructor(options: RedisRateLimiterOptions = {}) {
    this.options = options;
  }

  async getClient(): Promise<RateLimitClient | null> {
    if (!this.client) {
      try {
        let redis: Redis;

        if (this.options.url) {
          // Use connection URL if provided
          redis = new Redis(this.options.url, {
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
              if (times > 3) {
                return null; // Stop retrying
              }
              return Math.min(times * 100, 3000); // Exponential backoff
            },
          });
        } else {
          // Use individual options
          redis = new Redis({
            host: this.options.host || "localhost",
            port: this.options.port || 6379,
            password: this.options.password,
            db: this.options.db || 0,
            tls: this.options.tls ? {} : undefined,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
              if (times > 3) {
                return null; // Stop retrying
              }
              return Math.min(times * 100, 3000); // Exponential backoff
            },
          });
        }

        // Test connection
        await redis.connect();
        await redis.ping();

        this.client = new RedisRateLimiter(redis);
        console.log("Redis rate limiter connected successfully");
      } catch (error) {
        console.error("Failed to connect to Redis for rate limiting:", error);
        return null;
      }
    }
    return this.client;
  }
}
