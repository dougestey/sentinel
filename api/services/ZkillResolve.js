/**
 * ZkillResolve
 *
 * @description :: Resolves zKill data to local model types.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

module.exports = {

  async kill(package) {

    let { killmail } = package;

    if (!killmail)
      return;

    let {
      killmail_id: killId,
      killmail_time: time,
      solar_system_id: systemId,
      victim: {
        character_id: characterId,
        position,
        ship_type_id: shipTypeId
      }
    } = killmail;

    // Check for local record. If it exists, cancel further logic.
    let existingRecord = await Kill.findOne({ killId });

    if (existingRecord || !characterId || !shipTypeId || !systemId) {
      sails.log.debug(`[ZkillResolve.kill] Issue with record: ${existingRecord} || characterId ${characterId} || shipTypeId ${shipTypeId} || systemId ${systemId}`);
      sails.log.debug('[ZkillResolve.kill] Cancelling resolve.');
      return;
    }

    let { id: ship } = await Swagger.type(shipTypeId),
        { id: victim } = await Swagger.character(characterId),
        { id: system } = await Swagger.system(systemId),
        positionName = await Resolver.position(position, systemId);

    let kill = await Kill.create({
      killId,
      time,
      position,
      positionName,
      ship,
      victim,
      system
    })
    .intercept('E_UNIQUE', (e) => { return sails.log.error(`[ZkillResolve.kill] Race condition: Tried to create a kill that already exists. ${e}`) })
    .fetch();

    // We don't track Sansha, and he doesn't track us.
    if (!package.zkb.npc)
      await Identifier.fleet(package.killmail, system, kill);

    kill = await Kill.findOne(kill.id)
      .populate('ship')
      .populate('victim')
      .populate('system')
      .populate('fleet');

    Dispatcher.notifySockets(kill, 'kill');
  }

};
