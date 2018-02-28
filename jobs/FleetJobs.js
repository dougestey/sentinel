const everyFiveMinutes = 1000 * 60 * 5;

let FleetJobs = {

  kickoff() {
    setInterval(Scheduler.determineFleetLife, everyFiveMinutes);
  }

};

module.exports = FleetJobs;
