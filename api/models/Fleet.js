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

    isActive: 'boolean',

    lastSeen: 'string',

    composition: 'json',

    configuration: {
      type: 'string',
      isIn: [
        'roam',
        'gatecamp',
        'hsgank',
        'hswar',
        'blops',
        'unknown'
      ]
    },

    efficiency: 'number',

    dangerRatio: 'number',

    // Relationships

    system: { model: 'system' },

    characters: { collection: 'character', via: 'fleet' },

    kills: { collection: 'kill', via: 'fleet' }

  },

};
