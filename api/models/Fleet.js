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
      isIn: ['roam', 'gatecamp', 'hsgank']
    },

    composition: 'json',

    efficiency: 'number',

    // Relationships

    system: { model: 'system' },

    characters: { model: 'character' },

    corporations: { collection: 'corporation' },

    alliances: { collection: 'alliance' },

    engagements: { collection: 'engagement' },

    kills: { collection: 'kill' }

  },

};
