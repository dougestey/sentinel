/**
 * Character.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    characterId: { type: 'number', unique: true },

    name: 'string',

    dangerRatio: 'number',

    // Relationships

    corporation: { model: 'corporation' },

    alliance: { model: 'alliance' },

    fleets: { collection: 'fleet', via: 'characters' },

    // Meta

    lastEsiUpdate: 'string',

    lastZkillUpdate: 'string'

  }

};
