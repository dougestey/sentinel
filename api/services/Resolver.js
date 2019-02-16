/**
 * Resolver
 *
 * @description :: Enriches data.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let Resolver = {

  async position(position, systemId) {
    if (!position || !systemId) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [Resolver] ESI failure: Incomplete position data`);

      return 'Unknown';
    }

    let response;

    try {
      response = await Fuzzworks.nearestCelestial(position, systemId);
    } catch(e) {
      sails.log.error(`[${new Date().toLocaleTimeString()}] [Resolver] Fuzzworks failure: ${e}`);
      return 'Unknown';
    }

    let {
      itemName,
      typeid: typeId,
      itemid: itemId } = response;

    // Unfortunately Fuzzworks doesn't give us an itemName for stargates.
    // It does seem to handle belts and stations fine. More testing req'd.
    if (!itemName) {
      let type = await Type.findOne(typeId);

      if (type && type.name) {
        if (type.name.indexOf('Stargate') !== -1) {
          let { name } = await Swagger.stargate(itemId);
          let { name: systemName } = await System.findOne(systemId);

          itemName = `${systemName} - ${name}`;
        } else {
          itemName = type.name;
        }
      }
    }

    if (itemName === 'bad item')
      return 'Abyssal Deadspace';

    return itemName ? itemName : 'Unknown';
  },

  async composition(ids, characters) {
    // ids: [] of pilots { character_id, ship_type_id }
    // characters: [] of character records

    let shipTypeIds = [];

    // Strip hash into [] for Swagger.names
    _.forEach(ids, (shipTypeId) => {
      shipTypeIds.push(shipTypeId);
    });

    let ships = await Swagger.names(_.uniq(shipTypeIds));

    _.forEach(ids, (shipTypeId, characterId) => {
      let charIndex = _.findIndex(characters, 'id', parseInt(characterId)),
          shipIndex = _.findIndex(ships, 'id', shipTypeId);

      if (charIndex !== -1)
        characters[charIndex].ship = ships[shipIndex];
    });

    return { characters, ships };
  }

};

module.exports = Resolver;
