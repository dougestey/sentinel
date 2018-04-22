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

    // No matching fleets, so we stop here.
    if (!fleets.length) {
      return _createFleet(killmail, kill, system);
    }

    sails.log.debug(`[Identifier.fleet] Scoring ${fleets.length} fleets...`);

    let scoredFleets = fleets.map((fleet) => {
      let { id, characters } = fleet;

      characters = characters.map((c) => c.characterId);

      let points = _.difference(attackers, characters).length,
          score = points / attackers.length;

      return { id, score, characters: characters.length };
    });

    sails.log.debug(`[Identifier.fleet] Sorting scored fleets...`);

    scoredFleets = _.sortByOrder(scoredFleets, ['score', 'characters'], ['asc', 'desc']);

    // 1 is the worst possible score (no matches, and theoretically impossible since we've
    // derived our fleet pool from matching characters) while 0 is the best (all matched)
    let maxScore = _.first(scoredFleets).score;
    let bestMatches = _.filter(scoredFleets, (sf) => sf.score === maxScore);

    // If we have more than one best match, merge those fleets. Then relate the kill & stop.
    if (bestMatches.length > 1) {
      let fleetsToMerge = bestMatches.map((match) => {
        return _.find(fleets, (f) => f.id === match.id);
      });

      let fleet = await _mergeFleets(fleetsToMerge, system);

      // Update existing fleet based on this kill.
      return _updateFleet(killmail, kill, system, fleet);
    }

    // We have only one match. Since we've already fetched the fleet records, no need
    // to re-query. Just grab it from the fleets []
    return _.find(fleets, (f) => f.id === bestMatch.id);
  }

};

module.exports = Identifier;
