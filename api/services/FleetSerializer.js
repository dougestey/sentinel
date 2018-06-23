module.exports = {

  // Flesh out useful corp/alliance data for chars.
  // Also resolve shiptypes.
  async one(id) {
    let fleet = await Fleet.findOne(id)
      .populate('system')
      .populate('characters');

    fleet.kills = await Kill.find({ fleet: fleet.id })
      .populate('ship')
      .populate('victim')
      .populate('system')
      .populate('fleet')
      .sort('time DESC')
      .limit(10);

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
    let { characters, ships } = await Resolver.composition(fleet.composition, resolvedChars);

    fleet.characters = characters;
    fleet.ships = ships;

    return fleet;
  }

};
