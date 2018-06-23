/**
 * Resolver
 *
 * @description :: Enriches data.
 * @help        :: See https://next.sailsjs.com/documentation/concepts/services
 */

let Resolver = {

  async position(position, systemId) {
    if (!position || !systemId) {
      sails.log.error('[Resolver] ESI failure: Incomplete position data');

      return 'Unknown';
    }

    let response;

    try {
      response = await Fuzzworks.nearestCelestial(position, systemId);
    } catch(e) {
      sails.log.error(`[Resolver] Fuzzworks failure: ${e}`);
      return 'Unknown';
    }

    let {
      itemName,
      typeid: typeId,
      itemid: itemId } = response;

    // Unfortunately Fuzzworks doesn't give us an itemName for stargates.
    // It does seem to handle belts and stations fine. More testing req'd.
    if (!itemName) {
      let type = await Swagger.type(typeId);

      if (type && type.name && type.name.indexOf('Stargate') !== -1) {
        let { name } = await Swagger.stargate(itemId);

        itemName = name;
      }
    }

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
      let charIndex = _.findIndex(characters, 'characterId', parseInt(characterId)),
          shipIndex = _.findIndex(ships, 'id', shipTypeId);

      if (charIndex !== -1)
        characters[charIndex].ship = ships[shipIndex];
    });

    return { characters, ships };
  }

};

module.exports = Resolver;
