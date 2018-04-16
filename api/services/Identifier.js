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

  let { time } = kill;

  let characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id));

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  let { composition } = fleet,
      lastSeen;

  // If this is the newest kill for the fleet, update the fleet's last seen time.
  if (fleet.lastSeen < time) {
    lastSeen = time;
  }

  _.forEach(killmail.attackers, ({ character_id, ship_type_id }) => {
    if (character_id === undefined || (fleet.composition[character_id] && time < fleet.lastSeen))
      return;

    composition[character_id] = ship_type_id;
  });

  await Fleet.update(fleet.id, { lastSeen, composition, system });

  fleet = await FleetSerializer.one(fleet.id);

  return fleet;
};

let _mergeFleets = async(fleets, systemId) => {
  // Record to merge into has already been sorted to top in Identifier.fleet
  let record = _.first(fleets),
      characters = [];

  for (let fleet of fleets) {
    characters = characters.concat(fleet.characters.map((c) => c.id));

    if (fleet.startTime < record.startTime)
      record.startTime = fleet.startTime;

    if (fleet.lastSeen > record.lastSeen)
      record.lastSeen = fleet.lastSeen;

    _.forEach(fleet.composition, (shipTypeId, characterId) => {
      if (record.composition[characterId] && fleet.lastSeen < record.lastSeen)
        return;

      record.composition[characterId] = shipTypeId;
    });

    if (fleet.id !== record.id) {
      await Fleet.destroy({ id: fleet.id });

      let system = await System.findOne(systemId);
      fleet.system = system;

      Dispatcher.notifySockets(fleet, 'fleet_expire');
    }
  }

  characters = _.uniq(characters);

  await Fleet.replaceCollection(record.id, 'characters').members(characters);

  let { startTime, lastSeen, composition } = record,
      updated = await Fleet.update(record.id, { startTime, lastSeen, composition }).fetch(),
      fleet = _.first(updated);

  // To avoid another lookup
  fleet.characters = characters;

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

    sails.log.debug(`[Identifier.fleet] Scoring ${fleets.length} fleets...`);

    let scoredFleets = fleets.map((fleet) => {
      let { id, characters } = fleet;

      characters = characters.map((c) => c.characterId);

      let points = _.difference(attackers, characters).length,
          score = points / attackers.length;

      return { id, score, characters: characters.length };
    }).filter((f) => f.score !== 1);

    sails.log.debug(`[Identifier.fleet] Sorting scored fleets...`);

    scoredFleets = _.sortByOrder(scoredFleets, ['score', 'characters'], ['asc', 'desc']);

    // 1 is the worst possible score (no matches) while 0 is the best (all matched)
    let bestMatch = _.first(scoredFleets), fleet;

    if (bestMatch) {
      fleet = _.find(fleets, (f) => f.id === bestMatch.id);

      // TODO: Arbitrary logic here. Iron this out a bit.
      if (!fleet || bestMatch.characters.length > 10 && bestMatch.score > 0.8) {
        // We don't have a good enough match, so create a new fleet.
        fleet = await _createFleet(killmail, kill, system);
      } else {
        // More than once match with the same score.
        // Merge those results before continuing.
        //
        // TODO: This needs more testing.
        if (scoredFleets.length > 1) {
          let fleetsToMerge = scoredFleets.map((sf) => {
            return _.find(fleets, (f) => f.id === sf.id);
          });

          fleet = await _mergeFleets(fleetsToMerge, system);
        }

        // Update existing fleet based on this kill.
        fleet = await _updateFleet(killmail, kill, system, fleet);
      }
    } else {
      // No matches whatsoever. Create a fleet.
      fleet = await _createFleet(killmail, kill, system);
    }

    return fleet;
  }

};

module.exports = Identifier;
