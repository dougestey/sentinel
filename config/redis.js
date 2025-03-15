const redis = require('redis');
const redisUrl = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const db = redis.createClient(redisUrl);

// db.flushdb();

module.exports.redis = db;
