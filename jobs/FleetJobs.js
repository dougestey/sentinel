const everyMinute = 1000 * 60;
const everyThirtySeconds = everyMinute / 2;

let FleetJobs = {

  kickoff() {
    this.determineFleetHealth();

    setInterval(this.determineFleetHealth, everyThirtySeconds);
    setInterval(this.determineFleetThreatLevel, everyThirtySeconds);
  },

  determineFleetHealth() {
    let job = sails.config.jobs.create('determine_fleet_health').priority('medium');

    job.on('failed', function(err) {
      sails.log.error('[Fleet.determineFleetHealth] Job failed');
      sails.log.error(err);
    });

    job.save();
  },

  determineFleetThreatLevel() {
    let job = sails.config.jobs.create('determine_fleet_threat_level').priority('low');

    job.on('failed', function(err) {
      sails.log.error('[Fleet.determineFleetThreatlevel] Job failed');
      sails.log.error(err);
    });

    job.save();
  }

};

module.exports = FleetJobs;
