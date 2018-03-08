/**
 * ZkillStats
 *
 * @description :: Combat statistics from Zkill.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

const request = require('request');

module.exports = {

  character(characterId) {
    return new Promise((resolve, reject) => {
      request({
        url: `https://zkillboard.com/api/stats/characterID/${characterId}/`,
        method: 'GET',
        headers: {
          'User-Agent': 'http://gloss.space'
        },
        gzip: true
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
