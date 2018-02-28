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
      victim: {
        character_id: characterId,
        position,
        ship_type_id: shipTypeId,
        solar_system_id: systemId
      }
    } = killmail;

    // Check for local record. If it exists, cancel further logic.
    let existingRecord = await Kill.findOne({ killId });

    if (existingRecord)
      return existingRecord;

    let ship = await Swagger.type(shipTypeId),
        victim = await Swagger.character(characterId),
        system = await Swagger.system(systemId);

    let kill = await Kill.create({
      killId,
      time,
      position,
      ship,
      victim,
      system
    }).fetch().populate('system');

    if (!package.zkb.npc)
      Identifier.fleet(package.killmail, system, kill);

    return kill;
  }

};
