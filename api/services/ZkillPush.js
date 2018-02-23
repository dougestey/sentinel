/**
 * ZkillPush
 *
 * @description :: Service handler for zKill push.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

const ZKILL_PUSH_URL = 'https://redisq.zkillboard.com/listen.php?ttw=3',
      request = require('request');

let _shouldTrack = (package) => {
  return !package.zkb.npc || process.env.TRACK_NPC === 'true';
};

module.exports = {

  fetch() {
    return new Promise((resolve, reject) => {
      request(ZKILL_PUSH_URL, async(error, response, body) => {
        if (error) {
          sails.log.error(error);
          return reject(error);
        }

        // Sometimes the service returns null, see: https://github.com/zKillboard/RedisQ
        if (!body || body.indexOf('<') === 0) {
          return resolve();
        }

        let decodedResponse = JSON.parse(body);

        if (!decodedResponse.package)
          return resolve();

        if (_shouldTrack(decodedResponse.package))
          ZkillResolve.kill(decodedResponse.package);
          // Dispatcher.processKill(createdKill);

        return resolve();
      });
    });
  }

};
