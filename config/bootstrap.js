/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also do this by creating a hook.
 *
 * For more information on bootstrapping your app, check out:
 * https://sailsjs.com/config/bootstrap
 */

require('dotenv-safe').config();

module.exports.bootstrap = async function(done) {

  let offset = parseInt(process.env.BACKFILL_OFFSET);

  // Status object
  sails.config.sentinel = {
    backfill: {
      start: offset,
      current: offset,
      completed: 0
    },
    failures: {
      esi: 0,
      zkill: 0,
      sentinel: 0,
      other: 0
    },
    started: new Date().toISOString(),
    connected: false
  };

  // Job queue kickoff (config/jobs.js)
  sails.config.jobs.init();

  if (process.env.TRACK_ENABLED === 'true')
    ZkillSocket.connect();

  // Needed for Sails to complete lift.
  return done();

};
