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
  default: {
    adapter: 'sails-postgresql',
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },

  sde: {
    adapter: 'sails-postgresql',
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: 'sde',
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
};
