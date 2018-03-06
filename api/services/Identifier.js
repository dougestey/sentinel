/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let _resolveCharacters = async(ids) => {
  let resolved = ids.map(async(id) => {
    let character = await Swagger.character(id);

    if (character)
      return character.id;
  });

  return Promise.all(resolved);
};

let _createFleet = async(killmail, kill, system) => {
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

  if (!fleet)
    console.log('WTF: No fleet after create?');

  characters = _.compact(characters);

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  // Notify WebSockets
  let room = System.getRoomName(system);

  sails.io.sockets.in.room.clients((err, members) => {
    members.map(async(socketId) => {
      let data = await Fleet.findOne(fleet.id);

      // Pipe it down to the client
      sails.sockets.broadcast(socketId, 'fleet', data);
    });
  });
};

let _updateFleet = async(killmail, kill, system, fleet) => {
  let { time } = kill;

  let characters = await _resolveCharacters(killmail.attackers.map((a) => a.character_id));

  characters = _.compact(characters);

  // If this is the newest kill for the fleet, update the fleet attrs.
  if (fleet.lastSeen < time) {
    let lastSeen = time,
        composition = _.countBy(killmail.attackers.map((a) => a.ship_type_id));

    await Fleet.update(fleet.id, { lastSeen, composition, system });
  }

  await Fleet.addToCollection(fleet.id, 'characters').members(characters);
  await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);

  console.log(`Fleet ${fleet.id} got a new kill!`);
};

// TODO: Deal with merging comps. Requires breaking changes to how we record the shiptypes.
let _mergeFleets = async(fleets) => {
  console.log(`Merging fleets...`);

  let record = _.last(fleets.sort((a, b) => a.characters.length - b.characters.length)),
      characters = [];

  fleets.map(async(fleet) => {
    characters.concat(fleet.characters);

    if (fleet.startTime < record.startTime)
      record.startTime = fleet.startTime;

    if (fleet.lastSeen > record.lastSeen)
      record.lastSeen = fleet.lastSeen;

    if (fleet.id !== record.id)
      await Fleet.destroy({ id: fleet.id });
  });

  characters = _.uniq(characters);

  await Fleet.addToCollection(record.id, 'characters').members(characters);

  let { startTime, lastSeen } = record;

  await Fleet.update(record.id, { startTime, lastSeen });
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

      return { id, score };
    }).filter((f) => f.score !== 1);

    console.log('');
    console.log(scoredFleets);

    // 1 is the worst possible score (no matches) while 0 is the best (all matched)
    let bestMatch = _.first(_.sortBy(scoredFleets, 'score'));

    if (bestMatch) {
      console.log(`Match for kill scored at ${(Math.abs(bestMatch.score - 1) * 100).toFixed(2)}%`);

      let fleet = _.find(fleets, (fleet) => fleet.id = bestMatch.id);

      _updateFleet(killmail, kill, system, fleet);
    } else {
      console.log(`Creating new fleet for killmail ${killmail.killmail_id}`);

      _createFleet(killmail, kill, system);
    }

    if (scoredFleets.length > 1) {
      let fleetsToMerge = scoredFleets.map((f) => {
        return _.find(fleets, (fleet) => fleet.id = f.id);
      });

      _mergeFleets(fleetsToMerge);
    }
  }

};

module.exports = Identifier;
