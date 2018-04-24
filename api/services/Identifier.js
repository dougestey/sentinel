/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let _resolveCharacters = async(ids) => {
  let resolved = [];

  sails.log.debug(`[Identifier._resolveCharacters] Resolving ${ids.length} characters...`);

  for (let characterId of ids) {
    let character;

    try {
      character = await Swagger.character(characterId);
    } catch(e) {
      sails.log.error(`[Identifier._resolveCharacters] ${JSON.stringify(e)}`);
    }

    if (character && character.id)
      resolved.push(character.id);
  }

  sails.log.debug('[Identifier._resolveCharacters] End');

  // TODO: Does this _.compact call do anything?
  return _.compact(resolved);
};

let _determineActiveCharacters = async({ id: fleet }) => {
  let kills = await Kill.find({ fleet }).sort('time DESC').limit(3);

  let activeCharacters = [];

  kills.map(({ attackers }) => {
    activeCharacters = activeCharacters.concat(attackers);
  });

  activeCharacters = await _resolveCharacters(_.compact(activeCharacters));

  return activeCharacters;
};

let _createFleet = async(killmail, kill, system) => {
  let { killmail_time: startTime } = killmail,
      lastSeen = startTime,
      characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id)),
      composition = {},
      configuration = 'unknown',
      isActive = true;

  _.forEach(killmail.attackers, ({ character_id, ship_type_id }) => {
    if (character_id !== undefined)
      composition[character_id] = ship_type_id;
  });

  let fleet = await Fleet.create({
    startTime,
    lastSeen,
    composition,
    configuration,
    isActive,
    system
  })
  .intercept((e) => sails.log.error('Fleet create error:', e))
  .fetch();

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  fleet = await FleetSerializer.one(fleet.id);

  return fleet;
};

let _updateFleet = async(killmail, kill, system, fleet) => {
  if (!fleet) {
    return sails.log.error('[Identifier._updateFleet] No fleet to update');
  }

  let { time, attackers } = kill;

  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  let latestCharacters = await _resolveCharacters(attackers.map((a) => a.character_id));
  let activeCharacters = await _determineActiveCharacters(fleet);

  await Fleet.replaceCollection(fleet.id, 'characters').members(activeCharacters);

  let { composition, lastSeen } = fleet;

  // If this is the newest kill for the fleet, update the fleet's last seen time.
  if (lastSeen < time) {
    lastSeen = time;
  }

  // Add new ships to comp, update existing if this is a newer mail
  attackers.map(({ character_id, ship_type_id }) => {
    if (character_id === undefined || (composition[character_id] && time < lastSeen))
      return;

    composition[character_id] = ship_type_id;
  });

  // Remove ships for pilots that have left
  _.keys(composition).map((characterId) => {
    if (!_.includes(activeCharacters, characterId))
      delete composition[characterId];
  });

  await Fleet.update(fleet.id, { lastSeen, composition, system });

  fleet = await FleetSerializer.one(fleet.id);

  return fleet;
};

let Identifier = {

  async fleet(killmail, system, kill) {
    // Attackers without a corporation ID aren't relevant
    let attackers = killmail.attackers.filter((a) => a.corporation_id).map((a) => a.character_id);

    // Some of the [] above will be undefined due to no corporation_id (NPC etc)
    // We still need the total number of attackers for scoring logic, so create a new compacted []
    let attackersWithIds = _.compact(attackers);

    // No real players with corporation_ids = no identifiable fleet
    if (!attackers.length)
      return;

    sails.log.debug(`[Identifier.fleet] Fetching active fleet records related to km...`);

    // The naive way. This sometimes racked up a couple hundred fleet records and over 1K characters.
    // i.e. don't do this anywhere.
    //
    // let fleets = await Fleet.find({ isActive: true }).populate('characters');
    let fleetIds = [];

    for (let characterId of attackersWithIds) {
      let record = await Character.findOne({ characterId });

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
      return _updateFleet(killmail, kill, system, fleets[0]);
    }

    // We have more than one fleet candidate, so let's score them.
    sails.log.debug(`[Identifier.fleet] Scoring ${fleets.length} fleets...`);

    let candidates = fleets.map((candidate) => {
      let { id, characters } = candidate;

      characters = characters.map((c) => c.characterId);

      let mostPilots, leastPilots;

      if (attackers.length > characters.length || attackers.length === characters.length) {
        mostPilots = attackers;
        leastPilots = characters;
      } else {
        mostPilots = characters;
        leastPilots = attackers;
      }

      let differentIds = _.difference(mostPilots, leastPilots),
          similarity = 1 - differentIds.length / mostPilots.length;

      return { id, similarity, size: characters.length };
    });

    sails.log.debug(`[Identifier.fleet] Sorting potential matches...`);

    candidates = _.sortByOrder(candidates, ['similarity', 'size'], ['desc', 'desc']);

    let bestMatch = _.first(candidates);
    let fleet = _.find(fleets, (f) => f.id === bestMatch.id);

    if (bestMatch && fleet) {
      // Update existing fleet based on this kill.
      return _updateFleet(killmail, kill, system, fleet);
    } else {
      // No matches whatsoever. Create a fleet.
      return _createFleet(killmail, kill, system);
    }
  }

};

module.exports = Identifier;
