/**
 * SystemController
 *
 * @description :: Server-side logic for managing Systems
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

let _resolveNearestCelestial = async(position, systemId) => {
  let {
    itemName,
    typeid: typeId,
    itemid: itemId } = await Fuzzworks.nearestCelestial(position, systemId);

  // Unfortunately Fuzzworks doesn't give us an itemName for stargates.
  // It does seem to handle belts and stations fine. More testing req'd.
  if (!itemName) {
    let type = await Swagger.type(typeId);

    if (type.name.indexOf('Stargate') !== -1) {
      let { name } = await Swagger.stargate(itemId);

      itemName = name;
    }
  }

  return itemName ? itemName : 'Unknown';
};

module.exports = {

  async track(req, res) {
    if (!req.params.systemId)
      return res.badRequest();

    let { systemId } = req.params;

    let system = await System.findOne({ systemId });

    if (!system)
      return res.notFound();

    let fleets = await Fleet.find({ system: system.id, isActive: true })
      .populate('characters')
      .populate('kills')
      .sort('lastSeen DESC');

    let kills = await Kill.find({ system: system.id })
      .populate('ship')
      .populate('victim')
      .populate('fleet')
      .sort('time DESC')
      .limit(10);

    // Report kill positions.
    let resolvedKills = [];

    for (let kill of kills) {
      if (!kill.positionName || !kill.positionName.length) {
        let positionName = await _resolveNearestCelestial(kill.position, systemId);

        await Kill.update(kill.id, { positionName });

        kill.positionName = positionName;
      }

      resolvedKills.push(kill);
    }

    // Flesh out useful corp/alliance data for chars.
    for (let fleet of fleets) {
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

      fleet.characters = resolvedChars;
    }

    // Subscribe sockets to future system updates.
    if (req.isSocket) {
      System.subscribe(req, [system.id]);
    }

    return res.status(200).json({ systemId, system, fleets, kills: resolvedKills });
  }

};
