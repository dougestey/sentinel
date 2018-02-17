/**
 * ZkillPush
 *
 * @description :: Service handler for zKill push.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

const ZKILL_PUSH_URL = 'https://redisq.zkillboard.com/listen.php?ttw=3';

let request = require('request');

let _commitKill = async(killmail) => {
  let {
    killmail_id: killId,
    killmail_time: time,
    solar_system_id: systemId,
    victim: {
      character_id: victimCharacterId,
      ship_type_id: victimShipTypeId,
      corporation_id: victimCorporationId,
      alliance_id: victimAllianceId
    }
  } = killmail,
  attacker = killmail.attackers[0], // Top damage is listed first
  fleetComposition = _.countBy(killmail.attackers.map((a) => a.ship_type_id)),
  fleetAffiliation = _.countBy(killmail.attackers.map((a) => a.corporation_id)),
  totalAttackers = killmail.attackers.length;

  let {
    character_id: attackerCharacterId,
    ship_type_id: attackerShipTypeId,
    corporation_id: attackerCorporationId,
    alliance_id: attackerAllianceId
  } = attacker;

  let createdKill = await Kill.create({
    killId,
    time,
    systemId,
    victimCharacterId,
    victimShipTypeId,
    victimCorporationId,
    victimAllianceId,
    attackerCharacterId,
    attackerShipTypeId,
    attackerCorporationId,
    attackerAllianceId,
    fleetComposition,
    fleetAffiliation,
    totalAttackers
  });

  return createdKill;
};

module.exports = {

  fetch() {
    return new Promise((resolve, reject) => {
      request(ZKILL_PUSH_URL, async(error, response, body) => {
        if (error) {
          sails.log.error(error);
          return reject(error);
        }

        // Sometimes the service returns null, see: https://github.com/zKillboard/RedisQ
        if (!body || body.indexOf('<') === 0) {
          return resolve();
        }

        let { package } = JSON.parse(body);

        // See line 62
        if (!package || !package.killmail) {
          return resolve();
        }

        let { killmail } = package,
            createdKill = await _commitKill(killmail);

        ActiveSockets.processKill(createdKill);

        resolve();
      });
    });
  }

};
