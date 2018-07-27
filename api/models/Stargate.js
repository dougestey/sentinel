/**
 * Stargate.js
 *
 * @description :: How to get this information from the SDE is something I've
 *              :: researched for some time to no avail, likely due to the
 *              :: i18n mechanisms CCP employs. So we hit ESI for it. For now.
 *
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

// TODO: Determine where this lies in the SDE
module.exports = {

  attributes: {

    stargateId: { type: 'number', unique: true },

    name: 'string'

  }

};
