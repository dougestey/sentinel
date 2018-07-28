let redis = require('redis'),
    redisUrl = 'redis://localhost:6667/';

if (process.env.NODE_ENV === 'production') {
  redisUrl = 'redis://localhost:6666/';
}

let db = redis.createClient(redisUrl);

db.flushdb();

module.exports.redis = db;
