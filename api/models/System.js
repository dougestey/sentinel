/**
 * System.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'sde',

  tableName: 'mapSolarSystems',

  attributes: {

    createdAt: false,

    updatedAt: false,

    id: {
      columnName: 'solarSystemID',
      type: 'number',
      autoIncrement: false,
      required: true
    },

    name: { columnName: 'solarSystemName', type: 'string' },

    securityStatus: { columnName: 'security', type: 'number' },

    // Relationships

    constellation: { columnName: 'constellationID', model: 'constellation' },

    region: { columnName: 'regionID', model: 'region' },

  }

};
