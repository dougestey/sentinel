/**
 * Development environment settings
 * (sails.config.*)
 *
 * For more best practices and tips, see:
 * https://sailsjs.com/docs/concepts/deployment
 */

module.exports = {

  models: {
    datastore: 'sentinel'
  },

  port: 8081,

  hookTimeout: 60000

};
