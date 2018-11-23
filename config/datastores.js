/**
 * Datastores
 * (sails.config.datastores)
 *
 * A set of datastore configurations which tell Sails where to fetch or save
 * data when you execute built-in model methods like `.find()` and `.create()`.
 *
 *  > This file is mainly useful for configuring your development database,
 *  > as well as any additional one-off databases used by individual models.
 *  > Ready to go live?  Head towards `config/env/production.js`.
 *
 * For more information on configuring datastores, check out:
 * https://sailsjs.com/config/datastores
 */

module.exports.datastores = {

  sentinel: {
    adapter: 'sails-postgresql',
    host: 'localhost',
    port: 5432,
    database: 'sentinel',
    user: 'sentinel',
    password: 'sentinel'
  },

  sentinelDev: {
    adapter: 'sails-postgresql',
    host: 'localhost',
    port: 5432,
    database: 'sentinel_dev',
    user: 'sentinel',
    password: 'sentinel'
  },

  sde: {
    adapter: 'sails-postgresql',
    host: 'localhost',
    port: 5432,
    database: 'eve',
    user: 'eve',
    password: 'eve'
  },

  sdeDev: {
    adapter: 'sails-postgresql',
    host: 'localhost',
    port: 5432,
    database: 'eve_dev',
    user: 'eve',
    password: 'eve'
  }

};
