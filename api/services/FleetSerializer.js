module.exports = {

  // Flesh out useful corp/alliance data for chars.
  // Also resolve shiptypes.
  async one(id) {
    let fleet = await Fleet.findOne(id);

    fleet.system = await System.findOne(fleet.system)
      .populate('region');

    fleet.characters = await Character.find({ fleet: fleet.id })
      .populate('corporation')
      .populate('alliance');

    fleet.kills = await Kill.find({ fleet: fleet.id })
      .populate('ship')
      .populate('victim')
      .populate('system')
      .populate('fleet')
      .sort('time DESC');

    // Now let's resolve the ship type IDs for each character.
    let { characters, ships } = await Resolver.composition(fleet.composition, fleet.characters);

    fleet.characters = characters;
    fleet.ships = ships;

    return fleet;
  }

};
