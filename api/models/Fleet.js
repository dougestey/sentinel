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

    composition: 'json',

    configuration: {
      type: 'string',
      isIn: [
        'solo',
        'roam',
        'gatecamp',
        'hsgank',
        'hswar',
        'unknown'
      ]
    },

    efficiency: 'number',

    dangerRatio: 'number',

    // Relationships

    system: { model: 'system' },

    characters: { collection: 'character' },

    // engagements: { collection: 'engagement' },

    kills: { collection: 'kill' }

  },

};
