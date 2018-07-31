/**
 * System.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

let datastore = 'sdeDev';

if (process.env.NODE_ENV === 'production') {
  datastore = 'sde';
}

module.exports = {

  datastore,

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

    x: { columnType: 'decimal', type: 'number' },

    y: { columnType: 'decimal', type: 'number' },

    // Relationships

    constellation: { columnName: 'constellationID', model: 'constellation' },

    region: { columnName: 'regionID', model: 'region' },

  }

};
