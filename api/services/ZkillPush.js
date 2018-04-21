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
    return new Promise(async(resolve, reject) => {
      let esiIsOnline;

      try {
        esiIsOnline = await Swagger.status();
      } catch(e) {
        return reject(new Error('ESI is not responding, pausing kill fetch.'));
      }

      if (!esiIsOnline)
        return reject(new Error('ESI endpoint degradation detected, pausing kill fetch.'));

      request({
        url: 'https://redisq.zkillboard.com/listen.php?ttw=3', 
        method: 'GET',
        headers: {
          'User-Agent': 'http://gloss.space'
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
          sails.log.debug(`[ZkillPush.fetch] Have a package for kill ${body.package.killID}, sending to resolve.`);

          await ZkillResolve.kill(body.package);
        } else {
          sails.log.debug(`[ZkillPush.fetch] Ignoring NPC kill.`);
        }

        return resolve();
      });
    });
  }

};
