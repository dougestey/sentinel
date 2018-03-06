const everyFiveMinutes = 1000 * 60 * 5;

let FleetJobs = {

  kickoff() {
    setInterval(Scheduler.determineFleetHealth, everyFiveMinutes);
  }

};

module.exports = FleetJobs;
