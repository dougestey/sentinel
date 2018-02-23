/**
 * Identifier
 *
 * @description :: Identifies fleet patterns.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let Identifier = {

  async fleet(killmail, system, kill) {
    // Assuming new fleet
    let startTime = new Date().toISOString(),
        lastSeen = startTime,
        composition = _.countBy(killmail.attackers.map((a) => a.ship_type_id));

    let characters = killmail.attackers.map(async({ character_id: characterId }) => {
      let { id } = await Swagger.character({ characterId });

      return id;
    });

    let fleet = await Fleet.create({
      startTime,
      lastSeen,
      composition,
      // configuration,
      // efficiency,
      system,
      // engagements
    });

    await Fleet.addToCollection(fleet.id, 'kills').members([kill.id]);
    await Fleet.addToCollection(fleet.id, 'characters').members(characters);

    return fleet;
  }

};

module.exports = Identifier;
