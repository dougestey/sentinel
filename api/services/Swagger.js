/**
 * Swagger
 *
 * @description :: The gateway to ESI. Resolves EVE IDs to local records with caching.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

let ESI = require('eve-swagger-simple'),
    request = require('request'),
    qs = require('qs'),
    moment = require('moment');

let _endpointIsNeeded = (endpoint) => {
  let requiredEndpoints = [
    '/universe/names/',
    '/universe/systems/',
    '/characters/{character_id}/',
    '/universe/types/{type_id}/',
    '/universe/systems/{system_id}/',
    '/universe/stargates/{stargate_id}/',
    '/corporations/{corporation_id}/',
    '/alliances/{alliance_id}/'
  ];

  let isNeeded = false;

  requiredEndpoints.map((route) => {
    if (route === endpoint.route)
      return true;
  });
};

module.exports = {

  status() {
    return new Promise((resolve, reject) => {
      request.get('https://esi.tech.ccp.is/status.json',
      { json: true },
      (error, response, body) => {
        if (error) {
          sails.log.error(`[Swagger.status] ${error}`);
          return resolve(false);
        }

        if (!body || !body.length || !Array.isArray(body))
          return resolve(false);

        let allSystemsGo = true,
            status = body;

        status.map((endpoint) => {
          if (_endpointIsNeeded(endpoint) && endpoint.status !== 'green') {
            allSystemsGo = false;

            sails.log.error(`[Swagger.status] ${endpoint.route} is ${endpoint.status}.`);
          }
        });

        return resolve(allSystemsGo);
      });
    });
  },

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
          sails.log.error(`[Swagger.names] ${error}`);
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

    let localCharacter = await Character.findOne(characterId);

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
        id: characterId,
        name,
        lastEsiUpdate,
        corporation: corporation ? corporation.id : null,
        alliance: alliance ? alliance.id : null
      })
      .intercept('E_UNIQUE', (e) => { sails.log.error(`[Swagger.character] Race condition: Tried to create a character that already exists. ${e}`) })
      .fetch();
    } else {
      let lastEsiUpdate = moment(localCharacter.lastEsiUpdate),
          now = moment();

      let diff = now.diff(lastEsiUpdate);
      let maxCacheTime = parseInt(process.env.CACHE_CHARACTERS_IN_DAYS) * 24 * 60 * 60 * 1000;

      if (diff > maxCacheTime) {
        let {
          corporation_id: corporationId = null,
          alliance_id: allianceId = null
        } = await ESI.request(`/characters/${characterId}`);

        let alliance = await Swagger.alliance(allianceId),
          corporation = await Swagger.corporation(corporationId, alliance);

        localCharacter = await Character.update(characterId, {
          corporation: corporation ? corporation.id : null,
          alliance: alliance ? alliance.id : null,
          lastEsiUpdate: now.toISOString()
        }).fetch();

        localCharacter = _.first(localCharacter);
      }
    }

    return localCharacter;
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

    let localCorporation = await Corporation.findOne(corporationId);

    if (!localCorporation) {
      let { name,
            ticker,
            member_count: memberCount
          } = await ESI.request(`/corporations/${corporationId}`);

      localCorporation = await Corporation.create({
        id: corporationId,
        name,
        ticker,
        memberCount,
        alliance: allianceRecord ? allianceRecord.id : null
      })
      .intercept('E_UNIQUE', (e) => { sails.log.error(`[Swagger.corporation] Race condition: Tried to create a corporation that already exists. ${e}`) })
      .fetch();
    }

    return localCorporation;
  },

  async alliance(allianceId) {
    if (!allianceId)
      return;

    let localAlliance = await Alliance.findOne(allianceId);

    if (!localAlliance) {
      let { name, ticker } = await ESI.request(`/alliances/${allianceId}`);

      localAlliance = await Alliance.create({ id: allianceId, name, ticker })
        .intercept('E_UNIQUE', (e) => { sails.log.error(`[Swagger.alliance] Race condition: Tried to create an alliance that already exists. ${e}`) })
        .fetch();
    }

    return localAlliance;
  },

  async killmail(id, hash) {
    let package = await ESI.request(`/killmails/${id}/${hash}`);

    return package;
  }

};
