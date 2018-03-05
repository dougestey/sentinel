/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let _resolveCharacters = async(ids) => {
  let resolved = ids.map(async(id) => {
    let character = await Swagger.character(id);

    return character.id;
  });

  return Promise.all(resolved);
};

let _createFleet = async(killmail, system, kill) => {
  let { killmail_time: startTime } = killmail,
      lastSeen = startTime,
      characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id)),
      composition = _.countBy(killmail.attackers.map((a) => a.ship_type_id)),
      configuration = 'unknown',
      isActive = true;

  let fleet = await Fleet.create({
    startTime,
    lastSeen,
    composition,
    configuration,
    isActive,
    system
  }).fetch();

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);
};

let _updateFleet = async(fleet, { kill, system }) => {
  let { time } = kill;

  // If this is the newest kill for the fleet, update the fleet attrs.
  if (fleet.lastSeen < time) {
    let lastSeen = time,
        characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id)),
        composition = _.countBy(killmail.attackers.map((a) => a.ship_type_id));

    await Fleet.update(fleet.id, { lastSeen, characters, composition, system });
    await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  }

  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);
};

let Identifier = {

  async fleet(killmail, system, kill) {
    let attackers = killmail.attackers.filter((a) => a.corporation_id).map((a) => a.character_id),
        isNewFleet;

    // Killed by NPCs = no fleet
    if (!attackers.length)
      return;

    let fleets = await Fleet.find({ isActive: true }),
        fleetsAndCharacters = {};

    _.forEach(fleets, (f) => {
      fleetsAndCharacters[f.id] = f.characters;
    });

    let scoredFleets = _.map(fleetsAndCharacters, (characters, id) => {
      let points = _.difference(attackers, characters).length,
          score = parseInt(points) / attackers.length;

      return { id, score };
    });

    // console.log('scoredFleets', scoredFleets);

    // Lower score is better.
    let bestMatch = _.last(_.sortBy(scoredFleets, 'score'));

    console.log('bestMatch', bestMatch);

    if (bestMatch) {
      if (bestMatch.score < 1) {
        _updateFleet(fleet, { kill, system });
      }
    } else {
      _createFleet(killmail, system, kill);
    }
  }

};

module.exports = Identifier;
