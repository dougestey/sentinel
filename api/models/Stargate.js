/**
 * Stargate.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

// TODO: Determine where this lies in the SDE
module.exports = {

  attributes: {

    stargateId: { type: 'number', unique: true },

    name: 'string'

  }

};
