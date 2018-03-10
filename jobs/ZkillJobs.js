const everyMinute = 1000 * 60;
const everyFiveMinutes = everyMinute * 5;
const everyThirtySeconds = everyMinute / 2;

let ZkillJobs = {

  kickoff() {
    this.readKillStream();
    this.updateDangerRatios();

    setInterval(this.updateDangerRatios, everyThirtySeconds);
  },

  readKillStream() {
    let job = sails.config.jobs.create('read_kill_stream');

    job.on('failed', function(err) {
      console.error('[Zkill.readKillStream] Job failed');
      console.error(err);
    });

    job.save();
  },

  updateDangerRatios() {
    let job = sails.config.jobs.create('update_danger_ratios');

    job.on('failed', function(err) {
      console.error('[Zkill.updateDangerRatios] Job failed');
      console.error(err);
    });

    job.save();
  }

};

module.exports = ZkillJobs;
