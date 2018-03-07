const everyFiveMinutes = 1000 * 60 * 5;

let FleetJobs = {

  kickoff() {
    setInterval(this.determineFleetHealth, everyFiveMinutes);
  },

  determineFleetHealth() {
    let job = sails.config.jobs.create('determine_fleet_health');

    job.on('failed', function(err) {
      console.error('[Fleet.readKillStream] Job failed');
      console.error(err);
    });

    job.save();
  }

};

module.exports = FleetJobs;
