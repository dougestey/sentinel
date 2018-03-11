/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

// TODO: Resolve nearest celestial

let _resolveCharacters = async(ids) => {
  let resolved = [];

  for (let characterId of ids) {
    let character = await Swagger.character(characterId);

    if (character)
      resolved.push(character.id);
  }

  return _.compact(resolved);
};

let _resolveComposition = async(typeHash) => {
  let ids = _.compact(_.map(_.keys(typeHash), (key) => parseInt(key))),
      composition = await Swagger.names(ids);

  // console.log('Resolving comp', ids);
  // console.log(composition);

  if (composition && composition.length) {
    composition = composition.map(({ id: typeId, name }) => {
      return { typeId, name, quantity: typeHash[typeId] };
    });
  }

  return composition;
};

let _createFleet = async(killmail, kill, system) => {
  // console.log(`Creating new fleet for kill ${killmail.killmail_id}`);

  let { killmail_time: startTime } = killmail,
      lastSeen = startTime,
      characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id)),
      typeHash = _.countBy(killmail.attackers.map((a) => a.ship_type_id)),
      configuration = 'unknown',
      isActive = true;

  let composition = await _resolveComposition(typeHash);

  let fleet = await Fleet.create({
    startTime,
    lastSeen,
    composition,
    configuration,
    isActive,
    system
  })
  .intercept((e) => console.log('Fleet create error:', e))
  .fetch();

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  fleet = await Fleet.findOne(fleet.id)
    .populate('system')
    .populate('characters')
    .populate('kills')
    .populate('system');

  Dispatcher.notifySockets(fleet, 'fleet', system);

  // console.log(`Created new fleet ${fleet.id}`);

  return fleet;
};

let _updateFleet = async(killmail, kill, system, fleet) => {
  if (!fleet) {
    return new Error('No fleet to update');
  }

  let { time } = kill;

  let characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id));

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  let composition, lastSeen;

  // If this is the newest kill for the fleet, update the fleet's last seen time.
  if (fleet.lastSeen < time) {
    lastSeen = time;
  }

  if (fleet.composition.length < killmail.attackers.length) {
    let typeHash = _.countBy(killmail.attackers.map((a) => a.ship_type_id));

    composition = await _resolveComposition(typeHash);
  }

  await Fleet.update({ id: fleet.id }, { lastSeen, composition, system });

  fleet = await Fleet.findOne(fleet.id)
    .populate('system')
    .populate('characters')
    .populate('kills')
    .populate('system');

  Dispatcher.notifySockets(fleet, 'fleet', system);

  // console.log(`Fleet ${fleet.id} got a new kill!`);

  return fleet;
};

let _mergeFleets = async(fleets) => {
  // console.log(`Merging fleets...`);

  // Record to merge into has already been determined in Identifier.fleet
  let record = _.first(fleets),
      characters = [];

  for (let fleet of fleets) {
    characters = characters.concat(fleet.characters.map((c) => c.id));

    if (fleet.startTime < record.startTime)
      record.startTime = fleet.startTime;

    if (fleet.lastSeen > record.lastSeen)
      record.lastSeen = fleet.lastSeen;

    if (fleet.id !== record.id)
      await Fleet.destroy({ id: fleet.id });
  }

  characters = _.uniq(characters);

  await Fleet.replaceCollection(record.id, 'characters').members(characters);

  let { startTime, lastSeen } = record,
      updated = await Fleet.update(record.id, { startTime, lastSeen }).fetch(),
      fleet = _.first(updated);

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

    let fleets = await Fleet.find({ isActive: true }).populate('characters');

    let scoredFleets = fleets.map((fleet) => {
      let { id, characters } = fleet;

      characters = characters.map((c) => c.characterId);

      let points = _.difference(attackers, characters).length,
          score = points / attackers.length;

      return { id, score, characters: characters.length };
    }).filter((f) => f.score !== 1);

    scoredFleets = _.sortByOrder(scoredFleets, ['score', 'characters'], ['asc', 'desc']);

    // console.log(scoredFleets);

    // 1 is the worst possible score (no matches) while 0 is the best (all matched)
    let bestMatch = _.first(scoredFleets), fleet;

    if (bestMatch) {
      // console.log(`Match for kill ${killmail.killmail_id} scored at ${(Math.abs(bestMatch.score - 1) * 100).toFixed(2)}%`);

      fleet = _.find(fleets, (f) => f.id === bestMatch.id);

      if (!fleet) {
        fleet = await _createFleet(killmail, kill, system);
      } else {
        if (scoredFleets.length > 1) {
          let fleetsToMerge = scoredFleets.map((sf) => {
            return _.find(fleets, (f) => f.id === sf.id);
          });

          fleet = await _mergeFleets(fleetsToMerge);
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
