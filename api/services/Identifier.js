/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let _resolveCharacters = async(ids) => {
  let resolved = [];

  sails.log.debug('[Identifier._resolveCharacters] Begin');

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

  return _.compact(resolved);
};

let _createFleet = async(killmail, kill, system) => {
  sails.log.debug('[Identifier._createFleet] Begin');

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

  fleet = await Fleet.findOne(fleet.id)
    .populate('system')
    .populate('characters')
    .populate('kills')
    .populate('system');

  let resolvedChars = [];

  for (let character of fleet.characters) {
    let corporation = await Corporation.findOne(character.corporation),
        alliance;

    if (character.alliance)
      alliance = await Alliance.findOne(character.alliance);

    character.corporation = corporation;
    character.alliance = alliance;

    resolvedChars.push(character);
  }

  await Promise.all(resolvedChars);

  // Now let's resolve the ship type IDs for each character.
  let resolvedCharsWithShips = await Resolver.composition(fleet.composition, resolvedChars);

  fleet.characters = resolvedCharsWithShips;

  Dispatcher.notifySockets(fleet, 'fleet');
  sails.log.debug('[Identifier._createFleet] End');
  return fleet;
};

let _updateFleet = async(killmail, kill, system, fleet) => {
  sails.log.debug('[Identifier._updateFleet] Begin');

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

  await Fleet.update({ id: fleet.id }, { lastSeen, composition, system });

  fleet = await Fleet.findOne(fleet.id)
    .populate('system')
    .populate('characters')
    .populate('kills')
    .populate('system');

  let resolvedChars = [];

  for (let character of fleet.characters) {
    let corporation = await Corporation.findOne(character.corporation),
        alliance;

    if (character.alliance)
      alliance = await Alliance.findOne(character.alliance);

    character.corporation = corporation;
    character.alliance = alliance;

    resolvedChars.push(character);
  }

  await Promise.all(resolvedChars);

  // Now let's resolve the ship type IDs for each character.
  let resolvedCharsWithShips = await Resolver.composition(fleet.composition, resolvedChars);

  fleet.characters = resolvedCharsWithShips;

  Dispatcher.notifySockets(fleet, 'fleet');
  sails.log.debug('[Identifier._updateFleet] End');
  return fleet;
};

let _mergeFleets = async(fleets) => {
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
    // Attackers without a corporation ID are NPCs
    let attackers = killmail.attackers.filter((a) => a.corporation_id).map((a) => a.character_id);

    // Killed by NPCs = no fleet
    if (!attackers.length)
      return;

    sails.log.debug(`[Identifier.fleet] Fetching active fleets...`);

    let fleets = await Fleet.find({ isActive: true }).populate('characters');

    sails.log.debug(`[Identifier.fleet] Scoring fleets...`);

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

      if (!fleet) {
        fleet = await _createFleet(killmail, kill, system);
      } else {
        if (scoredFleets.length > 1) {
          let fleetsToMerge = scoredFleets.map((sf) => {
            return _.find(fleets, (f) => f.id === sf.id);
          });

          fleet = await _mergeFleets(fleetsToMerge, system);
        }

        fleet = await _updateFleet(killmail, kill, system, fleet);
      }
    } else {
      fleet = await _createFleet(killmail, kill, system);
    }

    return fleet;
  }

};

module.exports = Identifier;
