/**
 * Swagger
 *
 * @description :: The gateway to ESI.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

const ESI_AUTH_URL = 'https://login.eveonline.com/oauth/token';

let ESI = require('eve-swagger-simple'),
    request = require('request'),
    qs = require('qs'),
    client_id = process.env.ESI_CLIENT_ID,
    client_secret = process.env.ESI_CLIENT_SECRET;

module.exports = {

  async initialize() {
    let systems = await ESI.request('/universe/systems'),
        fn = async function(systemId) {
          await System.findOrCreate({ systemId }, { systemId });
        };

    let resolvedSystems = await Promise.all(systems.map(fn));

    return resolvedSystems;
  },

  async type(typeId) {
    let localType = await Type.findOne({ typeId }), type;

    if (!localType) {
      let { name, description, published } = await ESI.request(`/universe/types/${typeId}`);

      localType = await Type.create({
        typeId,
        name,
        description,
        published
      });
    } else if (!localType.name) {
      let { name, description, published } = await ESI.request(`/universe/types/${typeId}`);

      await Type.update({ typeId }, {
        typeId,
        name,
        description,
        published
      });

      localType = await Type.findOne({ typeId });
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

      await System.update({ systemId }, {
        name: system.name,
        position: system.position,
        securityStatus: system.security_status,
        securityClass: system.security_class
      });
    }

    localSystem = await System.findOne({ systemId });

    return localSystem;
  },

  async corporation(corporationId) {
    let localCorporation = await Corporation.findOne({ corporationId });

    if (!localCorporation) {
      let { name,
            ticker,
            member_count: memberCount,
            alliance_id: allianceId
          } = await ESI.request(`/corporations/${corporationId}`),
          alliance;

      if (allianceId)
        alliance = await Alliance.findOrCreate({ allianceId }, { allianceId });

      localCorporation = await Corporation.create({
        corporationId,
        name,
        ticker,
        memberCount,
        alliance: alliance ? alliance.id : undefined
      });
    }

    return localCorporation;
  },

  async alliance(allianceId) {
    let localAlliance = await Alliance.findOne({ allianceId });

    if (!localAlliance || !localAlliance.name) {
      let { name, ticker } = await ESI.request(`/alliances/${allianceId}`);

      if (!localAlliance)
        localAlliance = await Alliance.create({ allianceId, name, ticker });

      if (!localAlliance.name)
        localAlliance = await Alliance.update({ allianceId }, { name, ticker }).fetch();
    }

    return localAlliance;
  },

  character(characterId) {
    return ESI.request(`/characters/${characterId}`);
  },

};
