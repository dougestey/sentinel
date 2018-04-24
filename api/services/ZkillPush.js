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
        return resolve(new Error('ESI is not responding, pausing kill fetch.'));
      }

      if (!esiIsOnline)
        return resolve(new Error('ESI endpoint degradation detected, pausing kill fetch.'));

      sails.log.debug('[ZkillPush.fetch] ESI is green.');

      request({
        url: 'https://redisq.zkillboard.com/listen.php?ttw=3', 
        method: 'GET',
        headers: {
          'User-Agent': process.env.APP_URL
        },
        json: true
      }, async(error, response, body) => {
        if (error) {
          if (!response || !response.statusCode) {
            sails.log.error(`[ZkillPush.fetch] No response from RedisQ.`);
            return resolve();
          }

          sails.log.error(`[ZkillPush.fetch] ${response.statusCode} ${error}`);
          return resolve();
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
