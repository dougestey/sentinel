let ZkillJobs = {

  kickoff() {
    this.readKillStream();
  },

  readKillStream() {
    let job = sails.config.jobs.create('read_kill_stream');

    job.on('failed', function(err) {
      console.error('[Zkill.readKillStream] Job failed');
      console.error(err);
    });

    job.save();
  }

};

module.exports = ZkillJobs;
