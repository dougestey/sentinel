const everyMinute = 1000 * 60;
const everyThirtySeconds = everyMinute / 2;
const fiveMinutes = 5 * everyMinute;

let ZkillJobs = {

  kickoff() {
    this.readKillStream();
    this.updateDangerRatios();

    setInterval(this.updateDangerRatios, everyThirtySeconds);
    // Kill stream jobs are kicked off by themselves every time one finishes.
  },

  readKillStream() {
    let job = sails.config.jobs.create('read_kill_stream').ttl(fiveMinutes);

    job.on('failed', function(err) {
      sails.log.error('[Zkill.readKillStream] Job failed');
      sails.log.error(err);
    });

    job.save();
  },

  updateDangerRatios() {
    let job = sails.config.jobs.create('update_danger_ratios').priority('low');

    job.on('failed', function(err) {
      sails.log.error('[Zkill.updateDangerRatios] Job failed');
      sails.log.error(err);
    });

    job.save();
  }

};

module.exports = ZkillJobs;
