/**
 * Fuzzworks
 *
 * @description :: Tools from Fuzzworks.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

const request = require('request');

module.exports = {

  nearestCelestial({ x, y, z }, systemId) {
    return new Promise((resolve, reject) => {
      request({
        url: `https://www.fuzzwork.co.uk/api/nearestCelestial.php?x=${x}&y=${y}&z=${z}&solarsystemid=${systemId}`,
        method: 'GET',
        headers: {
          'User-Agent': 'https://gloss.space'
        },
        json: true
      }, (error, response, body) => {
        if (error || !body) {
          sails.log.error(`[${new Date().toLocaleTimeString()}] [Fuzzworks.nearestCelestial] ${response.statusCode} ${error}`);
          return reject();
        }

        sails.log.silly(`[Fuzzworks.nearestCelestial] Success.`);
        sails.log.silly(`[Fuzzworks.nearestCelestial] ${body}`);

        return resolve(body);
      });
    });
  }

};
