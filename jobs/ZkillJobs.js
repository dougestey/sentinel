const everyMinute = 1000 * 60;
const everyThirtySeconds = everyMinute / 2;

let ZkillJobs = {

  kickoff() {
    this.updateDangerRatios();

    // Kill stream jobs are kicked off by themselves every time one finishes.
    // Everything else needs an interval set.
    setInterval(this.updateDangerRatios, everyThirtySeconds);
  },

  updateDangerRatios() {
    let job = sails.config.jobs.create('update_danger_ratios').priority('low').ttl(everyMinute);

    job.on('failed', function(err) {
      sails.log.error('[Zkill.updateDangerRatios] Job failed');
      sails.log.error(err);
    });

    job.save();
  }

};

module.exports = ZkillJobs;
