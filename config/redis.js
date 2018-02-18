var redis = require('redis');
var url = require('url');
var redisUrl = url.parse('redis://user:@localhost:6379/');

var db = redis.createClient();

db.flushall();

module.exports.redis = db;
