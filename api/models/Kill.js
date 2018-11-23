/**
 * Kill.js
 *
 * @description :: Resolved kill report from zKillboard.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    killId: { type: 'number', unique: true },

    time: 'string',

    position: 'json',

    positionName: 'string',

    items: 'json',

    composition: 'json',

    meta: 'json',

    // Relationships

    ship: { model: 'type' },

    victim: { model: 'character' },

    system: { model: 'system' },

    fleet: { model: 'fleet' }

  }

};
