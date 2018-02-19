/**
 * System.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    systemId: 'number',

    name: 'string',

    securityStatus: 'number',

    // Relationships

    fleets: { collection: 'fleet' }

  }

};
