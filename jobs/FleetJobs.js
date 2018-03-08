const everyMinute = 1000 * 60;
const everyFiveMinutes = everyMinute * 5;

let FleetJobs = {

  kickoff() {
    setInterval(this.determineFleetHealth, everyFiveMinutes);
    setInterval(this.determineFleetThreatLevel, everyMinute);
  },

  determineFleetHealth() {
    let job = sails.config.jobs.create('determine_fleet_health');

    job.on('failed', function(err) {
      console.error('[Fleet.determineFleetHealth] Job failed');
      console.error(err);
    });

    job.save();
  },

  determineFleetThreatLevel() {
    let job = sails.config.jobs.create('determine_fleet_threat_level');

    job.on('failed', function(err) {
      console.error('[Fleet.determineFleetThreatlevel] Job failed');
      console.error(err);
    });

    job.save();
  }

};

module.exports = FleetJobs;
