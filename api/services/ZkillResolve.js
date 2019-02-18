/**
 * ZkillResolve
 *
 * @description :: Resolves zKill data to local model types.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

const _sdeFailure = (e) => {
  sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve] SDE failure.`);
  sails.log.error(e);
  sails.config.sentinel.failures.sentinel++;
  return;
}

const _esiFailure = (e) => {
  sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve] ESI failure.`);
  sails.log.error(e);
  sails.config.sentinel.failures.esi++;
  return;
}

let moment = require('moment');

module.exports = {

  async kill(killmail) {
    let {
      killmail_id: killId,
      killmail_time: time,
      solar_system_id: systemId,
      victim: {
        character_id: characterId,
        items,
        position,
        ship_type_id: shipTypeId
      },
      attackers,
      zkb: meta
    } = killmail;

    // Check for local record. If it exists, cancel further logic.
    let existingRecord = await Kill.findOne({ killId });

    if (existingRecord) {
      return sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Ignoring ${killId} - already in database.`);
    }

    if (!characterId || !shipTypeId || !systemId) {
      sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Issue with record: characterId ${characterId} || shipTypeId ${shipTypeId} || systemId ${systemId}`);
      sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Cancelling resolve.`);

      return;
    }

    let { id: ship } = await Type.findOne(shipTypeId).catch(_sdeFailure);
    let { id: victim } = await Swagger.character(characterId).catch(_esiFailure);
    let { id: system } = await System.findOne(systemId).catch(_sdeFailure);
    let positionName = await Resolver.position(position, systemId);

    let composition = {};

    attackers.map(({ character_id, ship_type_id }) => {
      if (character_id !== undefined)
        composition[character_id] = ship_type_id;
    });

    let kill = await Kill.create({
      killId,
      time,
      position,
      positionName,
      composition,
      items,
      meta,
      ship,
      victim,
      system
    })
    .intercept('E_UNIQUE', (e) => {
      sails.config.sentinel.failures.sentinel++;

      return sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Race condition: Tried to create a kill that already exists. ${e}`)
    })
    .fetch();

    let now = moment(),
        then = moment(time),
        fleet;

    let elapsedTime = now.diff(then, 'minutes');

    if (process.env.TRACK_FLEETS === 'true' && elapsedTime < parseInt(process.env.FLEET_EXPIRY_IN_MINUTES))
      fleet = await Identifier.fleet(killmail, system, kill);

    kill = await Kill.findOne(kill.id)
      .populate('ship')
      .populate('victim')
      .populate('system')
      .populate('fleet');

    if (fleet)
      Dispatcher.notifySockets(fleet, 'fleet');

    Dispatcher.notifySockets(kill, 'kill');

    return kill;
  }

};
