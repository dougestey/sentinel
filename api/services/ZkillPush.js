/**
 * ZkillPush
 *
 * @description :: Service handler for zKill push.
 * @help        :: https://github.com/zKillboard/RedisQ
 */

const request = require('request');

let _shouldTrack = (package) => {
  return !package.zkb.npc || process.env.TRACK_NPC === 'true';
};

module.exports = {

  fetch() {
    return new Promise((resolve, reject) => {
      request({
        url: 'https://redisq.zkillboard.com/listen.php?ttw=3', 
        method: 'GET',
        headers: {
          'User-Agent': 'https://gloss.space'
        },
        json: true
      }, async(error, response, body) => {
        if (error) {
          sails.log.error(`[ZkillPush.fetch] ${response.statusCode} ${error}`);
          return reject();
        }

        // Sometimes the service returns null, see: https://github.com/zKillboard/RedisQ
        // Because this isn't an error, we silently fail in order to avoid clogging Redis.
        if (!body || !body.package) {
          sails.log.debug(`[ZkillPush.fetch] No kill package to grab this time.`);

          return resolve();
        }

        // This await is important. We can't process kills in parallel because of race
        // conditions that could occur when creating new corp/character records etc.
        if (_shouldTrack(body.package)) {
          sails.log.debug(`[ZkillPush.fetch] Have a package, sending to resolve.`);

          await ZkillResolve.kill(body.package);
        } else {
          sails.log.debug(`[ZkillPush.fetch] Nothing from Zkill this time.`);
        }

        return resolve();
      });
    });
  }

};
