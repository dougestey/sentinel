/**
 * Kill.js
 *
 * @description :: Kill report as retrieved from the zKill/Push service.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    killId: 'number',

    time: 'string',

    position: 'json',

    // Relationships

    ship: { model: 'type' },

    victim: { model: 'character' },

    system: { model: 'system' },

    fleets: { collection: 'fleet' }

  }

};
