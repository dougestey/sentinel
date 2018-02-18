/**
 * Scheduler
 *
 * @description :: Schedules jobs in Kue.
 * @help        :: https://github.com/Automattic/kue
 */

module.exports = {

  // zKill

  readKillStream() {
    let job = sails.config.jobs.create('read_kill_stream');

    job.on('failed', function(err) {
      console.error('[Scheduler.readKillStream] Job failed');
      console.error(err);
    });

    job.save();
  }

};
