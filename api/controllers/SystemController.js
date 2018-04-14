/**
 * SystemController
 *
 * @description :: Server-side logic for managing Systems
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

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
      .sort('lastSeen DESC')
      .limit(6);

    let kills = await Kill.find({ system: system.id })
      .populate('ship')
      .populate('victim')
      .populate('fleet')
      .sort('time DESC')
      .limit(10);

    // Flesh out useful corp/alliance data for chars.
    // Also resolve shiptypes.
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

      // Now let's resolve the ship type IDs for each character.
      let resolvedCharsWithShips = await Resolver.composition(fleet.composition, resolvedChars);

      fleet.characters = resolvedCharsWithShips;
    }

    // Subscribe sockets to future system updates.
    if (req.isSocket) {
      Dispatcher.joinPool(req);
    }

    return res.status(200).json({ systemId, system, fleets, kills });
  }

};
