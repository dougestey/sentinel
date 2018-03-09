/**
 * Fuzzwork
 *
 * @description :: Tools from Fuzzwork.
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
          'User-Agent': 'http://gloss.space'
        }
      }, (error, response, body) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        if (!body)
          return reject();

        resolve(JSON.parse(body));
      });
    });
  }

};
