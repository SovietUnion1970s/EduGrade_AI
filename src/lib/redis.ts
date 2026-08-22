import { Redis } from 'ioredis';

const redisClientSingleton = () => {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Bắt buộc cho BullMQ
  });
};

const redisSubscriberSingleton = () => {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
};

type RedisClientSingleton = ReturnType<typeof redisClientSingleton>;

const globalForRedis = globalThis as unknown as {
  redis: RedisClientSingleton | undefined;
  redisSubscriber: RedisClientSingleton | undefined;
};

export const redis = globalForRedis.redis ?? redisClientSingleton();
export const redisSubscriber = globalForRedis.redisSubscriber ?? redisSubscriberSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
  globalForRedis.redisSubscriber = redisSubscriber;
}

export const getRedisClient = () => redis;
export const getRedisSubscriber = () => redisSubscriber;
