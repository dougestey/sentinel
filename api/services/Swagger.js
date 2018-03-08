/**
 * Swagger
 *
 * @description :: The gateway to ESI.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

let ESI = require('eve-swagger-simple')
    qs = require('qs');

module.exports = {

  async initialize() {
    let systems = await ESI.request('/universe/systems'),
        fn = async function(systemId) {
          await System.findOrCreate({ systemId }, { systemId });
        };

    let resolvedSystems = await Promise.all(systems.map(fn));

    return resolvedSystems;
  },

  async names(ids) {
    return ESI.request('/universe/names', { ids });
  },

  async character(characterId) {
    if (!characterId)
      return;

    let localCharacter = await Character.findOne({ characterId });

    if (!localCharacter) {
      let {
        name,
        corporation_id: corporationId,
        alliance_id: allianceId
      } = await ESI.request(`/characters/${characterId}`);

      let alliance = await Swagger.alliance(allianceId),
          corporation = await Swagger.corporation(corporationId, alliance),
          lastEsiUpdate = new Date().toISOString();

      localCharacter = await Character.create({
        characterId,
        name,
        lastEsiUpdate,
        corporation: corporation ? corporation.id : null,
        alliance: alliance ? alliance.id : null
      })
      .intercept('E_UNIQUE', (e) => { return new Error(`Tried to create a character that already exists. ${e}`) })
      .fetch();
    }

    return localCharacter;
  },

  async type(typeId) {
    if (!typeId)
      return;

    let localType = await Type.findOne({ typeId });

    if (!localType) {
      let { name } = await ESI.request(`/universe/types/${typeId}`);

      localType = await Type.create({
        typeId,
        name
      })
      .intercept('E_UNIQUE', (e) => { return new Error(`Tried to create a type that already exists. ${e}`) })
      .fetch();
    }

    return localType;
  },

  async system(systemId) {
    if (!systemId)
      return;

    let localSystem = await System.findOne({ systemId });

    if (!localSystem)
      return;

    // TODO: Improve this check
    if (!localSystem.name) {
      let system = await ESI.request(`/universe/systems/${systemId}`), constellation, star;

      localSystem = await System.update({ systemId }, {
        name: system.name,
        position: system.position,
        securityStatus: system.security_status,
        securityClass: system.security_class
      }).fetch();

      localSystem = _.first(localSystem);
    }

    return localSystem;
  },

  async corporation(corporationId, allianceRecord) {
    if (!corporationId)
      return;

    let localCorporation = await Corporation.findOne({ corporationId });

    if (!localCorporation) {
      let { name,
            ticker,
            member_count: memberCount
          } = await ESI.request(`/corporations/${corporationId}`);

      localCorporation = await Corporation.create({
        corporationId,
        name,
        ticker,
        memberCount,
        alliance: allianceRecord ? allianceRecord.id : null
      })
      .intercept('E_UNIQUE', (e) => { return new Error(`Tried to create a corp that already exists. ${e}`) })
      .fetch();
    }

    return localCorporation;
  },

  async alliance(allianceId) {
    if (!allianceId)
      return;

    let localAlliance = await Alliance.findOne({ allianceId });

    if (!localAlliance || !localAlliance.name) {
      let { name, ticker } = await ESI.request(`/alliances/${allianceId}`);

      if (!localAlliance) {
        localAlliance = await Alliance.create({ allianceId, name, ticker })
        .intercept('E_UNIQUE', (e) => { return new Error(`Tried to create an alliance that already exists. ${e}`) })
        .fetch();
      } else {
        localAlliance = await Alliance.update({ allianceId }, { name, ticker }).fetch();
        localAlliance = _.first(localAlliance);
      }
    }

    return localAlliance;
  }

};
