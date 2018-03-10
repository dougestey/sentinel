/**
 * Swagger
 *
 * @description :: The gateway to ESI.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

let ESI = require('eve-swagger-simple'),
    request = require('request'),
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

  // POSTing in eve-swagger-simple is absolute shit, so we use request.
  async names(ids) {
    if (!ids.length)
      return;

    return new Promise((resolve, reject) => {
      request.post('https://esi.tech.ccp.is/latest/universe/names/',
        {
          json: true,
          body: ids
        }
      , (error, response, body) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        if (!body)
          return reject();

        resolve(body);
      });
    });
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
      .intercept('E_UNIQUE', (e) => { console.log(`Tried to create a character that already exists. ${e}`) })
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
      .intercept('E_UNIQUE', (e) => { console.log(`Tried to create a type that already exists. ${e}`); })
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
      let system = await ESI.request(`/universe/systems/${systemId}`);

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

  async stargate(stargateId) {
    if (!stargateId)
      return;

    let localStargate = await Stargate.findOne({ stargateId });

    // TODO: Improve this check
    if (!localStargate) {
      let stargate = await ESI.request(`/universe/stargates/${stargateId}`);

      localStargate = await Stargate.create({
        stargateId: stargate.stargate_id,
        name: stargate.name
      }).fetch();
    }

    return localStargate;
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
      .intercept('E_UNIQUE', (e) => { console.log(`Tried to create a corp that already exists. ${e}`) })
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
        .intercept('E_UNIQUE', (e) => { console.log(`Tried to create an alliance that already exists. ${e}`) })
        .fetch();
      } else {
        localAlliance = await Alliance.update({ allianceId }, { name, ticker }).fetch();
        localAlliance = _.first(localAlliance);
      }
    }

    return localAlliance;
  }

};
