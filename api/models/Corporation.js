/**
 * Corporation.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    id: { type: 'number', autoIncrement: false, required: true },

    name: 'string',

    ticker: 'string',

    memberCount: 'number',

    activeCombatPilots: 'number',

    hasSupers: 'boolean',

    dangerRatio: 'number'

  }

};
