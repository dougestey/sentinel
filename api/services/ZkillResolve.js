/**
 * ZkillResolve
 *
 * @description :: Resolves zKill data to local model types.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

let moment = require('moment');

module.exports = {

  async kill(killmail) {

    let {
      killmail_id: killId,
      killmail_time: time,
      solar_system_id: systemId,
      victim: {
        character_id: characterId,
        position,
        ship_type_id: shipTypeId
      },
      attackers
    } = killmail;

    // Check for local record. If it exists, cancel further logic.
    let existingRecord = await Kill.findOne({ killId });

    if (existingRecord) {
      return sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Ignoring ${killId} - already in database.`);
    }

    if (!characterId || !shipTypeId || !systemId) {
      sails.log.debug(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Issue with record: characterId ${characterId} || shipTypeId ${shipTypeId} || systemId ${systemId}`);
      sails.log.debug('[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Cancelling resolve.');
      return;
    }

    let shipRes,
        victimRes,
        systemRes,
        positionRes;

    try {
      shipRes = await Type.findOne(shipTypeId);
    } catch(e) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve] ESI failure.`);
      sails.log.error(e);
      return;
    }

    try {
      victimRes = await Swagger.character(characterId);
    } catch(e) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve] ESI failure.`);
      sails.log.error(e);
      return;
    }

    try {
      systemRes = await System.findOne(systemId);
    } catch(e) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve] ESI failure.`);
      sails.log.error(e);
      return;
    }

    try {
      positionRes = await Resolver.position(position, systemId);
    } catch(e) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve] ESI failure.`);
      sails.log.error(e);
      return;
    }

    let { id: ship } = shipRes,
        { id: victim } = victimRes,
        { id: system } = systemRes,
        positionName = positionRes;

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
      ship,
      victim,
      system
    })
    .intercept('E_UNIQUE', (e) => { return sails.log.error(`[${new Date().toLocaleTimeString()}] [ZkillResolve.kill] Race condition: Tried to create a kill that already exists. ${e}`) })
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
