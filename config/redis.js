let redis = require('redis'),
    redisUrl = 'redis://localhost:6666/';

let db = redis.createClient(redisUrl);

db.flushdb();

module.exports.redis = db;
