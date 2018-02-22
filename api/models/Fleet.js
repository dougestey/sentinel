/**
 * Fleet.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    startTime: 'string',

    endTime: 'string',

    lastSeen: 'string',

    configuration: {
      type: 'string',
      isIn: ['solo', 'roam', 'gatecamp', 'hsgank', 'unknown']
    },

    efficiency: 'number',

    // Relationships

    system: { model: 'system' },

    characters: { collection: 'character' },

    corporations: { collection: 'corporation' },

    alliances: { collection: 'alliance' },

    composition: { collection: 'type' },

    engagements: { collection: 'engagement' },

    kills: { collection: 'kill' }

  },

};
