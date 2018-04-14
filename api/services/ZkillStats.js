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
          'User-Agent': 'https://gloss.space'
        },
        json: true,
        gzip: true
      }, (error, response, body) => {
        if (error || !body) {
          if (!response) {
            sails.log.error(`[ZkillStats.character] No response at all.`);
            return reject();
          }

          sails.log.error(`[ZkillStats.character] ${response.statusCode} ${error}`);
          return reject();
        }

        return resolve(body);
      });
    });
  }

};
