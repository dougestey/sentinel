/**
 * Region.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'sde',

  tableName: 'mapRegions',

  attributes: {

    createdAt: false,

    updatedAt: false,

    id: { columnName: 'regionID', type: 'number', autoIncrement: false, required: true },

    name: { columnName: 'regionName', type: 'string' },

  }

};
