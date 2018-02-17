/**
 * ZkillResolve
 *
 * @description :: Service to resolve data from zKill.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

let _buildCharacter = async(record) => {
  let { name } = await Swagger.characterPublic(record.characterId),
      ship = await Swagger.type(record.shipTypeId),
      corporation = await Swagger.corporation(record.corporationId),
      alliance;

  if (record.allianceId)
    alliance = await Swagger.alliance(record.allianceId);

  return {
    name,
    ship: ship.name,
    corporation: corporation.name,
    alliance: alliance ? alliance.name : undefined
  };
};

module.exports = {

  async kill(record) {
    let {
      killId,
      time,
      systemId,
      fleetComposition,
      fleetAffiliation,
      totalAttackers } = record;

    let victim = await _buildCharacter({
      characterId: record.victimCharacterId,
      shipTypeId: record.victimShipTypeId,
      corporationId: record.victimCorporationId,
      allianceId: record.victimAllianceId
    });

    let attacker = await _buildCharacter({
      characterId: record.attackerCharacterId,
      shipTypeId: record.attackerShipTypeId,
      corporationId: record.attackerCorporationId,
      allianceId: record.attackerAllianceId
    });

    let { name: system } = await Swagger.system(systemId);

    return {
      killId,
      time,
      systemId,
      system,
      victim,
      attacker,
      fleetComposition,
      fleetAffiliation,
      totalAttackers
    };
  }

};
