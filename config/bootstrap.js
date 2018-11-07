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

  // Job queue kickoff (config/jobs.js)
  sails.config.jobs.init();

  ZkillSocket.initialize();

  // Needed for Sails to complete lift.
  return done();

};
