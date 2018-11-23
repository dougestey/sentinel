const { CronJob } = require('cron');
const fs = require('fs');
const moment = require('moment');

const everyMinute = 1000 * 60;
const everyThirtySeconds = everyMinute / 2;

let ZkillJobs = {

  backfillOffset: parseInt(process.env.BACKFILL_OFFSET),

  kickoff() {
    this.updateDangerRatios();

    setInterval(this.updateDangerRatios, everyThirtySeconds);

    // if (process.env.BACKFILL_ENABLED === 'true') {
    //   let downtime = '0 11 * * *';
    //   let devtime = '11 14 * * *';

    //   new CronJob(devtime, this.backfill, null, true, 'Atlantic/Reykjavik');
    // }
    this.backfill();
  },

  updateDangerRatios() {
    let job = sails.config.jobs.create('update_danger_ratios').priority('low').ttl(everyMinute);

    job.on('failed', function(err) {
      sails.log.error('[Zkill.updateDangerRatios] Job failed');
      sails.log.error(err);
    });

    job.save();
  },

  async backfill() {
    let day = moment().subtract(this.backfillOffset, 'days').format('YYYYMMDD');
    let killHash = await ZkillStats.history(day);
    let killHashKeys = _.keys(killHash);
    let firstKill = parseInt(_.first(killHashKeys));
    let lastKill = parseInt(_.last(killHashKeys));

    let { rows: missingIds } = await Kill.getDatastore()
      .sendNativeQuery(
        `SELECT s.i AS "killId"
        FROM generate_series(${firstKill}, ${lastKill}) s(i)
        WHERE NOT EXISTS (SELECT 1 FROM kill WHERE "killId" = s.i);`
      );

    let backfillIds = [];

    for (let row of missingIds) {
      if (killHash[row.killId])
        backfillIds.push(row.killId);
    }

    sails.log.debug(`Backfilling for ${day}`);
    sails.log.debug(`${backfillIds.length} kills to backfill (out of ${killHashKeys.length})`);
    sails.log.debug(`Had ${((1 - backfillIds.length / killHashKeys.length) * 100).toFixed(2)}% before backfill.`);
    sails.log.debug(`Note that NPC kills are included in backfill calc, because the kill packages have not been resolved yet.`)

    // console.log(backfillIds);

    for (let id of backfillIds) {
      let hash = killHash[id];
      let job = sails.config.jobs.create('backfill', { id, hash }).priority('low');

      job.on('failed', function(err) {
        sails.log.error(`[${new Date().toLocaleTimeString()}] [Zkill.backfill] Job for ${id} failed`);
        sails.log.error(err);
      });

      job.save();
    }

    //   backfillJobs--;
    // }

    // sails.log.debug(`Spawned ${process.env.BACKFILL_JOBS} backfill processes of 200 kills.`);
  }

}

module.exports = ZkillJobs;
