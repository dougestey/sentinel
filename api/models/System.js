/**
 * System.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'sde', // this model references the EVE SDE
  tableName: 'mapSolarSystems',

  // Attributes
  attributes: {
    createdAt: false,
    updatedAt: false,
    id: {
      columnName: 'solarSystemID',
      type: 'number',
      autoIncrement: false,
      required: true,
    },
    name: { columnName: 'solarSystemName', type: 'string' },
    securityStatus: { columnName: 'security', type: 'number' },
    x: { columnType: 'decimal', type: 'number' },
    y: { columnType: 'decimal', type: 'number' },

    // Relationships
    constellation: { columnName: 'constellationID', model: 'constellation' },
    region: { columnName: 'regionID', model: 'region' },
  },
};
