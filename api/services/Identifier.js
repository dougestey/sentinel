/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

// Takes a set of characterIds, resolves them to local records,
// and returns an array of local ids.
//
// Now that Sentinel uses PostgreSQL with real character IDs as unique
// identifiers, this function should return the same thing passed to it.
let _resolveCharactersToIds = async(ids) => {
  let resolved = [];

  sails.log.silly(`[Identifier._resolveCharactersToIds] Resolving ${ids.length} characters...`);

  for (let characterId of ids) {
    let character;

    try {
      character = await Swagger.character(characterId);
    } catch(e) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [Identifier._resolveCharactersToIds] ${JSON.stringify(e)}`);
    }

    if (character && character.id)
      resolved.push(character.id);
  }

  sails.log.silly('[Identifier._resolveCharactersToIds] End');

  return _.compact(resolved);
};

// Takes a set of kills and returns an array of unique characterIds.
let _determineActiveCharacters = (kills) => {
  let characterIds = [];

  kills.map(({ composition }) => {
    for (let characterId of _.keys(composition)) {
      characterId = parseInt(characterId);

      characterIds.push(characterId);
    };
  });

  return _.uniq(characterIds);
};

// Takes a set of kills and returns a hash of characterIds to shipTypeIds.
let _determineActiveComposition = (kills) => {
  let totalComposition = {};

  kills.map(({ composition }) => {
    for (let characterId of _.keys(composition)) {
      totalComposition[characterId] = composition[characterId];
    }
  });

  return totalComposition;
};

let _createFleet = async(killmail, kill, system) => {
  let { killmail_time: startTime } = killmail,
      lastSeen = startTime,
      characters = await _resolveCharactersToIds(killmail.attackers.map((a) => a.character_id)),
      composition = _determineActiveComposition([kill]),
      configuration = 'unknown',
      isActive = true;

  let fleet = await Fleet.create({
    startTime,
    lastSeen,
    composition,
    configuration,
    isActive,
    system
  })
  .intercept((e) => sails.log.error(`[${new Date().toLocaleTimeString()}] [Identifier._createFleet] Fleet create error:`, e))
  .fetch();

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'history').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  return FleetSerializer.one(fleet.id);
};

let _updateFleet = async(fleet, kill, system) => {
  if (!fleet) {
    return sails.log.error(`[${new Date().toLocaleTimeString()}] [Identifier._updateFleet] No fleet to update`);
  }

  // First we add the kill to the fleet's collection, as it will impact other data.
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  // Then we fetch the three latest kills in order to determine who's actively in the fleet.
  let latestKills = await Kill.find({ fleet: fleet.id }).sort('time DESC').limit(3);
  let existingCharacters = await Character.find({ fleet: fleet.id });
  let activeCharacters = _determineActiveCharacters(latestKills);
  let composition = _determineActiveComposition(latestKills);

  existingCharacters = existingCharacters.map((character) => character.id);

  // Convert characterIds to local ids. This also creates character records for those
  // that Sentinel's DB isn't already aware of.
  activeCharacters = await _resolveCharactersToIds(activeCharacters);

  // So now we have activeCharacters[ids] and activeComposition {charId:shipTypeId}
  // If this is the newest kill for the fleet, update the fleet's last seen time.
  // Its location should also be updated. Composition and characters are still
  // valid due to the latest kill query above.
  if (fleet.lastSeen < kill.time) {
    fleet.lastSeen = kill.time;
    fleet.system = system;
  }

  // Ensure we're preserving character fleet history.
  await Fleet.addToCollection(fleet.id, 'history').members(existingCharacters);
  await Fleet.addToCollection(fleet.id, 'history').members(activeCharacters);

  // Update the fleet's collection of characters. This will drop expired ones.
  await Fleet.replaceCollection(fleet.id, 'characters').members(activeCharacters);

  // Update other attributes on the fleet
  await Fleet.update(fleet.id, {
    lastSeen: fleet.lastSeen,
    system: fleet.system,
    composition,
  });

  // Serialize and return
  return FleetSerializer.one(fleet.id);
};

let Identifier = {

  async fleet(killmail, system, kill) {
    // Attackers without a corporation ID aren't relevant
    let attackers = killmail.attackers.filter((a) => a.corporation_id).map((a) => a.character_id);

    // Some of the [] above will be undefined due to no corporation_id (NPC etc)
    // We still need the total number of attackers for scoring logic, so create a new compacted []
    let attackersWithIds = _.compact(attackers);

    // No real players with corporation_ids = no identifiable fleet
    if (!attackersWithIds.length)
      return;

    sails.log.silly(`[Identifier.fleet] Fetching active fleet records related to km...`);

    let fleetIds = [];

    for (let characterId of attackersWithIds) {
      let record = await Character.findOne(characterId);

      if (record && record.fleet)
        fleetIds.push(record.fleet);
    }

    // Some of the pilots above will be in the same fleet already. No point in resolving
    // those records more than once.
    fleetIds = _.uniq(fleetIds);

    let fleets = [];

    for (let id of fleetIds) {
      let record = await Fleet.findOne({ id, isActive: true }).populate('characters');

      if (record)
        fleets.push(record);
    }

    // No matches; create a fleet.
    if (!fleets.length) {
      return _createFleet(killmail, kill, system);
    }

    if (fleets.length === 1) {
      return _updateFleet(fleets[0], kill, system);
    }

    // We have more than one fleet candidate, so let's score them.
    sails.log.silly(`[Identifier.fleet] Scoring ${fleets.length} fleets...`);

    let candidates = fleets.map((candidate) => {
      let { id, characters } = candidate;

      characters = characters.map((c) => c.id);

      let mostPilots, leastPilots;

      if (attackersWithIds.length > characters.length || attackersWithIds.length === characters.length) {
        mostPilots = attackersWithIds;
        leastPilots = characters;
      } else {
        mostPilots = characters;
        leastPilots = attackersWithIds;
      }

      let differentIds = _.difference(mostPilots, leastPilots),
          similarity = 1 - differentIds.length / mostPilots.length;

      return { id, similarity, size: characters.length };
    });

    sails.log.silly(`[Identifier.fleet] Sorting potential matches...`);

    candidates = _.sortByOrder(candidates, ['similarity', 'size'], ['desc', 'desc']);

    let bestMatch = _.first(candidates);
    let fleet = _.find(fleets, (f) => f.id === bestMatch.id);

    if (bestMatch && fleet) {
      // Update existing fleet based on this kill.
      return _updateFleet(fleet, kill, system);
    } else {
      // No matches whatsoever. Create a fleet.
      return _createFleet(killmail, kill, system);
    }
  }

};

module.exports = Identifier;
