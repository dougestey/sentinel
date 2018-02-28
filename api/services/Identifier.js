/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

const moment = require('moment');

let _determineFleet = async(characters) => {
  //
};

let _factorFleetSize = (characters) => {
  return characters.length === 1 ? 'solo' : 'roam';
};

let _determineConfiguration = async(newKill, previousKills) => {
  if (previousKills) {
    let allKills = previousKills.push(newKill);
        systems = _uniq(allKills.map((k) => k.system)),
        times = allKills.sort((a, b) => a.time - b.time);

    // systems.length
  } else {
    let { securityStatus } = newKill.system;

    // https://stackoverflow.com/questions/6665997/switch-statement-for-greater-than-less-than
    if (Math.round(securityStatus) === -1) {
      // WH
      return _factorFleetSize(newKill.characters.length);
    } else if (securityStatus <= 0.45 && securityStatus >= 0) {
      // Lowsec
      return _factorFleetSize(newKill.characters.length);
    } else if (securityStatus < 0) {
      // Nullsec
      return _factorFleetSize(newKill.characters.length);
    } else {
      // Highsec
      // TODO: War or gank?
      return 'hsgank';
    }
  }
};

let _determineEfficiency = async(newKill, previousKills) => {
  // TODO: When we have Engagements
};

let _determineDangerRatio = async(newKill, previousKills) => {
  //
};

let _updateFleetStats = async(kill, fleet) => {
  if (existingFleet)
    let { kills: previousKills } = await Fleet.find(fleet.id).populate('kills');

  return {
    configuration: _determineConfiguration(kill, previousKills),
    // efficiency: _determineEfficiency(kill, previousKills),
    dangerRatio: _determineDangerRatio(kill, previousKills)
  }
};

let _updateActiveCharacters = async(fleet, characters) => {
  //
};

let Identifier = {

  async fleet(killmail, system, kill) {
    let { killmail_time: lastSeen } = killmail,
        characters,
        composition;

    let fleet = await _determineFleet(killmail.attackers),
        { configuration, dangerRatio } = await _updateFleetStats(kill, fleet),
        characters = killmail.attackers.map((a) => a.character_id);

    if (fleet) {
      if (fleet.lastSeen > lastSeen) {
        // Old kill
        lastSeen = fleet.lastSeen;
        composition = fleet.composition;
      } else {
        // New kill
        lastSeen = kill.time;
        composition = _.countBy(killmail.attackers.map((a) => a.ship_type_id));
      }

      fleet = await Fleet.update(fleet.id, {
        lastSeen,
        composition,
        configuration,
        // efficiency,
        dangerRatio,
        system
      }).fetch();

      fleet = await _updateActiveCharacters(fleet, characters);
    } else {
      // Assuming new fleet
      let startTime = lastSeen;

      composition = _.countBy(killmail.attackers.map((a) => a.ship_type_id));

      fleet = await Fleet.create({
        startTime,
        lastSeen,
        composition,
        configuration,
        // efficiency,
        dangerRatio,
        system
      }).fetch();

      await Fleet.addToCollection(fleet.id, 'characters').members(characters);
    }

    await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

    return fleet;
  }

};

module.exports = Identifier;
