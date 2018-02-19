/**
 * Alliance.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    allianceId: { type: 'number', unique: true },

    name: 'string',

    ticker: 'string',

    activeCombatPilots: 'number',

    hasSupers: 'boolean',

    dangerRatio: 'number'

  }

};
